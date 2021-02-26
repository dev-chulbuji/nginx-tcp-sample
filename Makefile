VERSION_FILE := ./nodeapp/VERSION
NODEAPP_VERSION := $(shell cat ${VERSION_FILE})

build:
	docker build -t nodeapp:$(NODEAPP_VERSION) ./nodeapp

run:
	export VERSION=$(NODEAPP_VERSION); docker-compose down; docker-compose up -d;
