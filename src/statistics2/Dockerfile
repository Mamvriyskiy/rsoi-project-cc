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

RUN go build -mod=vendor -o ./app

ENTRYPOINT [ "./app" ]
