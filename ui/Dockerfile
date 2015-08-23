FROM python:3.5
MAINTAINER Rich Harkins <rich.harkins@gmail.com>

WORKDIR /opt/ui/
ADD requirements.txt ./
RUN pip install -r requirements.txt 
ADD ./ ./
ENTRYPOINT [ "python3.5", "app.py" ]
EXPOSE 5000

