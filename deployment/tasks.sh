#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Instance name required"
else
  ansible-playbook -i ./instances/$1/hosts --extra-vars="instance=$1 version=$2" ansible/tasks.yml
fi
