# You can use most Debian-based base images
FROM e2bdev/code-interpreter:latest

# Install system dependencies first
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    # 数据处理和分析
    pandas \
    numpy \
    scipy \
    # 科学计算和统计
    statsmodels \
    scikit-learn \
    # 数值计算和优化
    sympy \
    numba \
    # 数据操作和格式支持
    pyarrow \
    openpyxl \
    xlrd \
    # 并行计算支持
    joblib \
    dask[complete] \
    # 工具包
    tqdm \
    python-dateutil \
    requests

# Clean up cache to reduce image size
# RUN pip cache purge