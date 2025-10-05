from setuptools import setup, find_packages

setup(
    name="bai",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'sqlalchemy>=2.0.0',
        'psycopg2-binary>=2.9.0',
        'pydantic>=1.8.0',
        'python-dotenv>=0.19.0',
    ],
)
