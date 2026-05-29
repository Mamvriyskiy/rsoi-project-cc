COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.yml
DEV_COMPOSE_FILES ?= -f $(COMPOSE_FILE) -f docker-compose.dev.yml
JENKINS_COMPOSE_FILE ?= docker-compose.jenkins.yml
SERVICE ?=
KUBECTL ?= kubectl
HELM ?= helm
K8S_NAMESPACE ?= rsoi
JENKINS_ADMIN_ID ?= admin
JENKINS_ADMIN_PASSWORD ?= admin

export JENKINS_ADMIN_ID
export JENKINS_ADMIN_PASSWORD

APP_SERVICES := \
	statistics-service \
	identity-provider-service \
	privileges-service \
	flights-service \
	tickets-service \
	gateway-service \
	frontend-service

.DEFAULT_GOAL := help

.PHONY: help config build rebuild up up-build down stop restart ps logs clean reset \
	dev-config dev-up dev-up-build dev-down dev-restart dev-ps dev-logs \
	jenkins-up jenkins-down jenkins-reset jenkins-restart jenkins-ps jenkins-logs jenkins-password \
	k8s-namespace k8s-deploy k8s-status k8s-rollout k8s-delete \
	statistics identity-provider privileges flights tickets gateway frontend

help:
	@printf '%s\n' 'Использование:'
	@printf '%s\n' '  make build              Собрать все Docker-образы'
	@printf '%s\n' '  make build SERVICE=name Собрать один сервис из compose'
	@printf '%s\n' '  make up                 Запустить проект в фоне'
	@printf '%s\n' '  make up-build           Собрать и запустить проект в фоне'
	@printf '%s\n' '  make down               Остановить и удалить контейнеры'
	@printf '%s\n' '  make reset              Пересоздать контейнеры и volume базы данных'
	@printf '%s\n' '  make logs               Смотреть логи в реальном времени'
	@printf '%s\n' '  make ps                 Показать статус контейнеров'
	@printf '%s\n' ''
	@printf '%s\n' 'Dev-режим без пересборки после правок кода:'
	@printf '%s\n' '  make dev-up-build       Первый запуск dev-режима'
	@printf '%s\n' '  make dev-up             Запустить dev-режим без пересборки'
	@printf '%s\n' '  make dev-restart SERVICE=name Перезапустить один Go-сервис'
	@printf '%s\n' '  make dev-logs           Смотреть dev-логи'
	@printf '%s\n' '  make dev-down           Остановить dev-режим'
	@printf '%s\n' ''
	@printf '%s\n' 'Jenkins CI/CD:'
	@printf '%s\n' '  make jenkins-up         Собрать и запустить Jenkins на http://localhost:8081'
	@printf '%s\n' '  make jenkins-password   Показать логин/пароль локального admin'
	@printf '%s\n' '  make jenkins-logs       Смотреть логи Jenkins'
	@printf '%s\n' '  make jenkins-down       Остановить Jenkins'
	@printf '%s\n' '  make jenkins-reset      Остановить Jenkins и удалить его volume'
	@printf '%s\n' ''
	@printf '%s\n' 'Kubernetes/Helm:'
	@printf '%s\n' '  make k8s-deploy         Развернуть postgres, kafka и сервисы в namespace rsoi'
	@printf '%s\n' '  make k8s-deploy K8S_NAMESPACE=name Развернуть в другой namespace'
	@printf '%s\n' '  make k8s-status         Показать pods/services/ingress'
	@printf '%s\n' '  make k8s-rollout        Проверить rollout всех deployment'
	@printf '%s\n' '  make k8s-delete         Удалить Helm-релизы'
	@printf '%s\n' ''
	@printf '%s\n' 'Быстрые команды для сервисов:'
	@printf '%s\n' '  make gateway flights tickets privileges identity-provider statistics frontend'

config:
	$(COMPOSE) -f $(COMPOSE_FILE) config

build: config
	$(COMPOSE) -f $(COMPOSE_FILE) build $(if $(SERVICE),$(SERVICE),$(APP_SERVICES))

rebuild: config
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache $(if $(SERVICE),$(SERVICE),$(APP_SERVICES))

up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d $(SERVICE)

up-build:
	$(COMPOSE) -f $(COMPOSE_FILE) up --build -d $(SERVICE)

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

stop:
	$(COMPOSE) -f $(COMPOSE_FILE) stop $(SERVICE)

restart:
	$(COMPOSE) -f $(COMPOSE_FILE) restart $(SERVICE)

ps:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f --tail=200 $(SERVICE)

clean:
	$(COMPOSE) -f $(COMPOSE_FILE) down --remove-orphans

reset:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans
	$(COMPOSE) -f $(COMPOSE_FILE) up --build -d

dev-config:
	$(COMPOSE) $(DEV_COMPOSE_FILES) config

dev-up:
	$(COMPOSE) $(DEV_COMPOSE_FILES) up -d $(SERVICE)

dev-up-build:
	$(COMPOSE) $(DEV_COMPOSE_FILES) up --build -d $(SERVICE)

dev-down:
	$(COMPOSE) $(DEV_COMPOSE_FILES) down

dev-restart:
	$(COMPOSE) $(DEV_COMPOSE_FILES) restart $(SERVICE)

dev-ps:
	$(COMPOSE) $(DEV_COMPOSE_FILES) ps

dev-logs:
	$(COMPOSE) $(DEV_COMPOSE_FILES) logs -f --tail=200 $(SERVICE)

jenkins-up:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) up --build -d

jenkins-down:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) down

jenkins-reset:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) down -v

jenkins-restart:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) restart jenkins

jenkins-ps:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) ps

jenkins-logs:
	$(COMPOSE) -f $(JENKINS_COMPOSE_FILE) logs -f --tail=200 jenkins

jenkins-password:
	@printf 'Логин: %s\nПароль: %s\n' '$(JENKINS_ADMIN_ID)' '$(JENKINS_ADMIN_PASSWORD)'

k8s-namespace:
	$(KUBECTL) create namespace $(K8S_NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

k8s-deploy: k8s-namespace
	$(HELM) upgrade --install postgres k8s/postgres-chart --namespace $(K8S_NAMESPACE)
	$(HELM) upgrade --install kafka k8s/kafka-chart --namespace $(K8S_NAMESPACE)
	$(HELM) upgrade --install services k8s/services-chart --namespace $(K8S_NAMESPACE)

k8s-status:
	$(KUBECTL) get pods,svc,ingress --namespace $(K8S_NAMESPACE)

k8s-rollout:
	$(KUBECTL) rollout status deployment/postgres --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/zookeeper --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/kafka --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/statistics --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/identity-provider --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/privileges --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/flights --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/tickets --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/gateway --namespace $(K8S_NAMESPACE) --timeout=180s
	$(KUBECTL) rollout status deployment/frontend --namespace $(K8S_NAMESPACE) --timeout=180s

k8s-delete:
	$(HELM) uninstall services --namespace $(K8S_NAMESPACE) --ignore-not-found
	$(HELM) uninstall kafka --namespace $(K8S_NAMESPACE) --ignore-not-found
	$(HELM) uninstall postgres --namespace $(K8S_NAMESPACE) --ignore-not-found

statistics:
	$(COMPOSE) -f $(COMPOSE_FILE) build statistics-service

identity-provider:
	$(COMPOSE) -f $(COMPOSE_FILE) build identity-provider-service

privileges:
	$(COMPOSE) -f $(COMPOSE_FILE) build privileges-service

flights:
	$(COMPOSE) -f $(COMPOSE_FILE) build flights-service

tickets:
	$(COMPOSE) -f $(COMPOSE_FILE) build tickets-service

gateway:
	$(COMPOSE) -f $(COMPOSE_FILE) build gateway-service

frontend:
	$(COMPOSE) -f $(COMPOSE_FILE) build frontend-service
