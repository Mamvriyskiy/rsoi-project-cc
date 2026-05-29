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
        string(name: 'KUBE_CONTEXT', defaultValue: 'kind-rsoi', description: 'kubectl context.')
        string(name: 'KUBECONFIG_CREDENTIALS_ID', defaultValue: 'local-kubeconfig', description: 'Jenkins file credential id with kubeconfig.')
        string(name: 'KIND_CLUSTER_NAME', defaultValue: 'rsoi', description: 'kind cluster name for loading local images.')
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

        stage('Load Images into kind') {
            when {
                expression {
                    return params.DEPLOY_TO_K8S && !params.PUSH_IMAGES && !params.IMAGE_REGISTRY.trim()
                }
            }
            steps {
                script {
                    def tag = params.IMAGE_TAG.trim() ?: env.BUILD_NUMBER
                    def kindClusterName = params.KIND_CLUSTER_NAME?.trim() ?: 'rsoi'

                    appServices.each { service ->
                        def image = imageName(service, params.IMAGE_REGISTRY, params.IMAGE_NAMESPACE)
                        sh "kind load docker-image '${image}:${tag}' --name '${kindClusterName}'"
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
                    def kubeconfigCredentialsId = params.KUBECONFIG_CREDENTIALS_ID?.trim() ?: 'local-kubeconfig'

                    def deployScript = {
                        def kubeNamespace = params.KUBE_NAMESPACE?.trim() ?: 'rsoi'
                        def kubeContext = params.KUBE_CONTEXT?.trim() ?: 'kind-rsoi'
                        def tag = params.IMAGE_TAG.trim() ?: env.BUILD_NUMBER
                        def pullPolicy = params.PUSH_IMAGES ? 'Always' : (params.IMAGE_REGISTRY.trim() ? 'IfNotPresent' : 'Never')
                        def overrides = helmImageOverrides(appServices, params.IMAGE_REGISTRY, params.IMAGE_NAMESPACE, tag, pullPolicy)
                        def contextSwitch = "kubectl config use-context '${kubeContext}'"

                        sh """
                            set -eu
                            ${contextSwitch}

                            echo "KUBECONFIG=\${KUBECONFIG:-<not set>}"
                            kubectl config current-context || true
                            kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}{"\\n"}' || true
                            kubectl cluster-info || true

                            kubectl create namespace '${kubeNamespace}' --dry-run=client -o yaml | kubectl apply -f -
                            helm upgrade --install postgres k8s/postgres-chart --namespace '${kubeNamespace}'
                            helm upgrade --install kafka k8s/kafka-chart --namespace '${kubeNamespace}'
                            helm upgrade --install services k8s/services-chart --namespace '${kubeNamespace}' ${overrides}

                            diagnose_deployment() {
                                deployment="\$1"
                                echo "=== Diagnostics for deployment/\${deployment} ==="
                                kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o wide || true
                                kubectl describe deployment "\${deployment}" --namespace '${kubeNamespace}' || true
                                kubectl get pods --namespace '${kubeNamespace}' -l "app=\${deployment}" -o wide || true
                                kubectl describe pods --namespace '${kubeNamespace}' -l "app=\${deployment}" || true
                                kubectl logs --namespace '${kubeNamespace}' -l "app=\${deployment}" --all-containers --tail=100 || true
                                kubectl get events --namespace '${kubeNamespace}' --sort-by=.lastTimestamp | tail -n 80 || true
                            }

                            rollout() {
                                deployment="\$1"
                                deadline=\$((\$(date +%s) + 300))

                                while [ "\$(date +%s)" -le "\${deadline}" ]; do
                                    generation="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.metadata.generation}')"
                                    observed="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.status.observedGeneration}')"
                                    desired="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.spec.replicas}')"
                                    updated="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.status.updatedReplicas}')"
                                    available="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.status.availableReplicas}')"
                                    unavailable="\$(kubectl get deployment "\${deployment}" --namespace '${kubeNamespace}' -o jsonpath='{.status.unavailableReplicas}')"

                                    desired="\${desired:-1}"
                                    observed="\${observed:-0}"
                                    updated="\${updated:-0}"
                                    available="\${available:-0}"
                                    unavailable="\${unavailable:-0}"

                                    echo "deployment/\${deployment}: generation \${observed}/\${generation}, updated \${updated}/\${desired}, available \${available}/\${desired}, unavailable \${unavailable}"

                                    if [ "\${observed}" = "\${generation}" ] && [ "\${updated}" = "\${desired}" ] && [ "\${available}" = "\${desired}" ] && [ "\${unavailable}" = "0" ]; then
                                        echo "deployment \"\${deployment}\" successfully rolled out"
                                        return 0
                                    fi

                                    sleep 5
                                done

                                echo "deployment \"\${deployment}\" did not finish rollout before timeout"
                                diagnose_deployment "\${deployment}"
                                exit 1
                            }

                            rollout postgres
                            rollout zookeeper
                            rollout kafka
                            rollout statistics
                            rollout identity-provider
                            rollout privileges
                            rollout flights
                            rollout tickets
                            rollout gateway
                            rollout frontend
                        """
                    }

                    if (kubeconfigCredentialsId) {
                        withCredentials([file(credentialsId: kubeconfigCredentialsId, variable: 'KUBECONFIG')]) {
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
