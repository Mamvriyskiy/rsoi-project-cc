# Jenkins CI/CD

Jenkins запускается локально в Docker и получает доступ к Docker Engine через `/var/run/docker.sock`.
Образ Jenkins уже содержит `docker`, `kubectl`, `helm` и базовые Pipeline-плагины.

## Запуск

```bash
docker compose -f docker-compose.jenkins.yml up --build -d
```

Jenkins будет доступен на `http://localhost:8081`.
Начальный пароль администратора:

```bash
docker exec rsoi-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Pipeline

Создай Pipeline job и укажи `Jenkinsfile` из репозитория. Пайплайн:

1. проверяет наличие `docker`, `kubectl`, `helm`;
2. запускает `go test ./...` для Go-сервисов;
3. собирает отдельный Docker-образ для каждого сервиса;
4. опционально пушит образы в registry;
5. разворачивает `postgres`, `kafka` и все сервисы в Kubernetes через Helm.

Для локального kind-кластера оставь `IMAGE_REGISTRY` пустым, `PUSH_IMAGES=false`, `KUBE_CONTEXT=kind-rsoi` и `KUBECONFIG_CREDENTIALS_ID=local-kubeconfig`.
Для внешнего кластера укажи `IMAGE_REGISTRY`, `IMAGE_NAMESPACE`, включи `PUSH_IMAGES` и добавь kubeconfig как Jenkins file credential, затем передай его id в `KUBECONFIG_CREDENTIALS_ID`.
