def appServices = [
    [chart: 'statistics', provider: 'statistics-service', context: 'src/statistics'],
    [chart: 'identity-provider', provider: 'identity-provider-service', context: 'src/identity-provider'],
    [chart: 'privileges', provider: 'privileges-service', context: 'src/privileges'],
    [chart: 'flights', provider: 'flights-service', context: 'src/flights'],
    [chart: 'tickets', provider: 'tickets-service', context: 'src/tickets'],
    [chart: 'gateway', provider: 'gateway-service', context: 'src/gateway'],
    [chart: 'frontend', provider: 'frontend-service', context: 'src/frontend']
]

String imageName(Map service, String registry, String namespace) {
    def prefix = namespace?.trim() ? "${namespace.trim()}/" : ''
    def repo = "${prefix}${service.provider}"

    if (registry?.trim()) {
        return "${registry.trim()}/${repo}"
    }

    return repo
}

String helmImageOverrides(List services, String registry, String namespace, String tag, String pullPolicy) {
    return services.collect { service ->
        def image = imageName(service, registry, namespace)
        [
            "--set ${service.chart}.service.image.name=${image}",
            "--set ${service.chart}.service.image.version=${tag}",
            "--set ${service.chart}.service.image.pullPolicy=${pullPolicy}"
        ].join(' ')
    }.join(' ')
}

pipeline {
    agent any

    options {
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'IMAGE_REGISTRY', defaultValue: '', description: 'Registry host. Leave empty for local Docker/Kubernetes.')
        string(name: 'IMAGE_NAMESPACE', defaultValue: 'rsoi', description: 'Image namespace or Docker Hub user.')
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Image tag. Empty means Jenkins build number.')
        booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Push images to IMAGE_REGISTRY before deploy.')
        string(name: 'DOCKER_REGISTRY_CREDENTIALS_ID', defaultValue: '', description: 'Optional username/password credentials id for docker login.')
        booleanParam(name: 'DEPLOY_TO_K8S', defaultValue: true, description: 'Deploy Helm releases to Kubernetes.')
        string(name: 'KUBE_NAMESPACE', defaultValue: 'rsoi', description: 'Kubernetes namespace.')
        string(name: 'KUBE_CONTEXT', defaultValue: '', description: 'Optional kubectl context.')
        string(name: 'KUBECONFIG_CREDENTIALS_ID', defaultValue: '', description: 'Optional Jenkins file credential id with kubeconfig.')
        string(name: 'OKTA_CLIENT_SECRET', defaultValue: '', description: 'Optional build arg for identity-provider.')
        string(name: 'OKTA_SSWS_TOKEN', defaultValue: '', description: 'Optional build arg for identity-provider.')
    }

    environment {
        DOCKER_BUILDKIT = '0'
    }

    stages {
        stage('Check Tools') {
            steps {
                sh 'docker version'
                sh 'kubectl version --client=true'
                sh 'helm version --short'
            }
        }

        stage('Test Go Services') {
            steps {
                sh '''
                    set -eu
                    for svc in statistics identity-provider privileges flights tickets gateway; do
                        (cd "src/$svc" && go test ./...)
                    done
                '''
            }
        }

        stage('Build Images') {
            steps {
                script {
                    def tag = params.IMAGE_TAG.trim() ?: env.BUILD_NUMBER

                    appServices.each { service ->
                        def image = imageName(service, params.IMAGE_REGISTRY, params.IMAGE_NAMESPACE)
                        def buildArgs = ''

                        if (service.chart == 'identity-provider') {
                            buildArgs = "--build-arg OKTA_CLIENT_SECRET='${params.OKTA_CLIENT_SECRET}' --build-arg OKTA_SSWS_TOKEN='${params.OKTA_SSWS_TOKEN}'"
                        }

                        sh "docker build ${buildArgs} -t '${image}:${tag}' '${service.context}'"
                    }
                }
            }
        }

        stage('Push Images') {
            when {
                expression { return params.PUSH_IMAGES }
            }
            steps {
                script {
                    if (params.DOCKER_REGISTRY_CREDENTIALS_ID.trim()) {
                        withCredentials([usernamePassword(credentialsId: params.DOCKER_REGISTRY_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                            sh "printf '%s' \"\$DOCKER_PASSWORD\" | docker login '${params.IMAGE_REGISTRY}' --username \"\$DOCKER_USER\" --password-stdin"
                        }
                    }

                    def tag = params.IMAGE_TAG.trim() ?: env.BUILD_NUMBER
                    appServices.each { service ->
                        def image = imageName(service, params.IMAGE_REGISTRY, params.IMAGE_NAMESPACE)
                        sh "docker push '${image}:${tag}'"
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression { return params.DEPLOY_TO_K8S }
            }
            steps {
                script {
                    def deployScript = {
                        def tag = params.IMAGE_TAG.trim() ?: env.BUILD_NUMBER
                        def pullPolicy = params.PUSH_IMAGES ? 'Always' : 'IfNotPresent'
                        def overrides = helmImageOverrides(appServices, params.IMAGE_REGISTRY, params.IMAGE_NAMESPACE, tag, pullPolicy)
                        def contextSwitch = params.KUBE_CONTEXT.trim() ? "kubectl config use-context '${params.KUBE_CONTEXT.trim()}'" : 'true'

                        sh """
                            set -eu
                            ${contextSwitch}
                            kubectl create namespace '${params.KUBE_NAMESPACE}' --dry-run=client -o yaml | kubectl apply -f -
                            helm upgrade --install postgres k8s/postgres-chart --namespace '${params.KUBE_NAMESPACE}'
                            helm upgrade --install kafka k8s/kafka-chart --namespace '${params.KUBE_NAMESPACE}'
                            helm upgrade --install services k8s/services-chart --namespace '${params.KUBE_NAMESPACE}' ${overrides}
                            kubectl rollout status deployment/postgres --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/zookeeper --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/kafka --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/statistics --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/identity-provider --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/privileges --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/flights --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/tickets --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/gateway --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                            kubectl rollout status deployment/frontend --namespace '${params.KUBE_NAMESPACE}' --timeout=180s
                        """
                    }

                    if (params.KUBECONFIG_CREDENTIALS_ID.trim()) {
                        withCredentials([file(credentialsId: params.KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG')]) {
                            deployScript()
                        }
                    } else {
                        deployScript()
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker image ls | head -n 30'
        }
    }
}
