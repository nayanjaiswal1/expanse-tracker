# Use a Python base image
FROM python:3.10-slim-buster

# Add local user bin to path to find executables installed by pip
ENV PATH="/root/.local/bin:$PATH"

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

ENV PATH="/root/.local/bin:$PATH"

# Set the working directory in the container
WORKDIR /app

RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i '/buster-updates/d' /etc/apt/sources.list

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project code
COPY . /app/

# Expose the port Django will run on
EXPOSE 8000

# Add local user bin to path to find executables installed by pip
ENV PATH="/root/.local/bin:$PATH"

# Command to run the Django application using Gunicorn
CMD ["pip", "freeze"]