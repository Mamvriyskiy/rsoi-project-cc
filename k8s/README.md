# Kubernetes deploy

Деплой разбит на три Helm-релиза:

- `postgres` из `k8s/postgres-chart`;
- `kafka` из `k8s/kafka-chart`;
- `services` из `k8s/services-chart`.

Каждый сервис приложения разворачивается отдельным `Deployment` с `replicas: 1`, то есть получает отдельный pod:

- `frontend`;
- `gateway`;
- `identity-provider`;
- `flights`;
- `tickets`;
- `privileges`;
- `statistics`.

Сервисные DNS-имена сохранены такими же, как в Go-конфигах: `postgres-service`, `kafka`, `flights-service`, `tickets-service`, `privileges-service`, `statistics-service`, `identity-provider-service`.

## Ручной деплой

```bash
kubectl create namespace rsoi --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install postgres k8s/postgres-chart --namespace rsoi
helm upgrade --install kafka k8s/kafka-chart --namespace rsoi
helm upgrade --install services k8s/services-chart --namespace rsoi
```

Для образов, собранных Jenkins, значения `image.name`, `image.version` и `image.pullPolicy` переопределяются в `Jenkinsfile`.
