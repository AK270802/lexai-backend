import os
import boto3
from botocore.client import Config
from django.conf import settings

class StorageService:
    def __init__(self):
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'lexai')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'lexai_secret')
        self.bucket = os.getenv('MINIO_BUCKET', 'lexai-documents')
        self.use_ssl = os.getenv('MINIO_USE_SSL', 'False').lower() == 'true'

        self.s3 = boto3.client(
            's3',
            endpoint_url=f"{'https' if self.use_ssl else 'http'}://{self.endpoint}",
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )

    def create_bucket_if_not_exists(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket)
        except Exception:
            self.s3.create_bucket(Bucket=self.bucket)

    def generate_presigned_upload_url(self, object_name, expiration=3600):
        self.create_bucket_if_not_exists()
        try:
            response = self.s3.generate_presigned_post(
                Bucket=self.bucket,
                Key=object_name,
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None

    def generate_presigned_download_url(self, object_name, expiration=3600):
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': object_name},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            print(f"Error generating presigned download URL: {e}")
            return None

    def upload_file(self, file_obj, object_name):
        self.create_bucket_if_not_exists()
        try:
            self.s3.upload_fileobj(file_obj, self.bucket, object_name)
            return True
        except Exception as e:
            print(f"Error uploading file: {e}")
            return False

    def delete_file(self, object_name):
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=object_name)
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False

    def download_file(self, object_name, local_path):
        try:
            self.s3.download_file(self.bucket, object_name, local_path)
            return True
        except Exception as e:
            print(f"Error downloading file: {e}")
            return False
