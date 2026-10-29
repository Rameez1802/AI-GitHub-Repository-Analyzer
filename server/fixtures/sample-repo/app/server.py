import subprocess
import requests
import yaml
from app.helpers import clean

AWS_KEY = "AKIAIOSFODNN7EXAMPLE"


def load_config(path):
    with open(path) as handle:
        return yaml.load(handle)


def fetch(url):
    try:
        return requests.get(url, verify=False).text
    except:
        return None


def run(command):
    print("running", command)
    return subprocess.call(command, shell=True)


def handle(request):
    name = clean(request.get("name", ""))
    # FIXME: validate the name before using it
    return {"hello": name}


if __name__ == "__main__":
    print(handle({"name": "World"}))
