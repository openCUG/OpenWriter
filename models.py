from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any


# API 配置
class APIConfig(BaseModel):
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model_name: str = "gpt-4o"

    model_config = {"protected_namespaces": ()}


# 模型配置
class ModelConfig(BaseModel):
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.9
    chunk_size: int = 15000  # 每个块的大小
    concurrent_requests: int = 64  # 并发请求数

    model_config = {"protected_namespaces": ()}


# 论文配置
class PaperConfig(BaseModel):
    topic: str = ""
    title: str = ""
    outline: List[str] = []
    api_config: Optional[Union[Dict[str, Any], APIConfig]] = None
    model_config: Optional[Union[Dict[str, Any], ModelConfig]] = None
    custom_prompt: Optional[str] = None
    is_new_generation: Optional[bool] = False

    model_config = {"protected_namespaces": ()}
