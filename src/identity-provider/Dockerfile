# syntax=docker/dockerfile:1

FROM golang:1.17

WORKDIR /app

COPY go.mod go.sum ./
RUN set -eu; \
    for attempt in 1 2 3 4 5; do \
        go mod download && break; \
        if [ "$attempt" = "5" ]; then exit 1; fi; \
        sleep $((attempt * 5)); \
    done

COPY . .

RUN mkdir -p logs temp

RUN go build -o ./app

EXPOSE 8040
ENV PORT=8040

ARG OKTA_CLIENT_SECRET
ENV OKTA_CLIENT_SECRET=$OKTA_CLIENT_SECRET

ARG OKTA_SSWS_TOKEN
ENV OKTA_SSWS_TOKEN=$OKTA_SSWS_TOKEN

ENTRYPOINT [ "./app" ]
