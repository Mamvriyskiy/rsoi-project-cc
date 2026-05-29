BUILD=11

kind load docker-image rsoi/statistics-service:$BUILD --name rsoi
kind load docker-image rsoi/identity-provider-service:$BUILD --name rsoi
kind load docker-image rsoi/privileges-service:$BUILD --name rsoi
kind load docker-image rsoi/flights-service:$BUILD --name rsoi
kind load docker-image rsoi/tickets-service:$BUILD --name rsoi
kind load docker-image rsoi/gateway-service:$BUILD --name rsoi
kind load docker-image rsoi/frontend-service:$BUILD --name rsoi
