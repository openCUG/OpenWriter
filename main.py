from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import uvicorn

# 导入API路由
from api import app

# 确保加载 .env 文件
load_dotenv(override=True)
print("Environment variables loaded from .env file")

# 确保当前目录存在
current_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(current_dir, exist_ok=True)

if __name__ == "__main__":
    # 挂载静态文件目录，使生成的文件可以被前端访问
    # 注意：这里使用"/static"作为路径前缀，避免与API路由冲突
    app.mount("/static", StaticFiles(directory=current_dir), name="static")

    # 挂载前端静态文件
    frontend_dir = os.path.join(os.path.dirname(current_dir), "frontend", "build")
    if os.path.exists(frontend_dir):
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
        print(f"Frontend static files mounted from {frontend_dir}")
    else:
        print(f"Frontend build directory not found at {frontend_dir}")

    uvicorn.run(app, host="0.0.0.0", port=8000)
