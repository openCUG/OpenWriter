from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
import asyncio
import os
from typing import List, Optional
from dotenv import load_dotenv
import subprocess
from pathlib import Path
import json
import time
from fastapi.staticfiles import StaticFiles

# 确保加载 .env 文件
load_dotenv(override=True)
print("Environment variables loaded from .env file")

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 确保当前目录存在
current_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(current_dir, exist_ok=True)

# 注意：静态文件挂载应该在所有API路由定义之后，否则会覆盖API路由
# 我们将在文件末尾添加静态文件挂载


# API 配置
class APIConfig(BaseModel):
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model_name: str = "gpt-4-turbo-preview"


# 模型配置
class ModelConfig(BaseModel):
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.9
    chunk_size: int = 15000  # 每个块的大小
    concurrent_requests: int = 64  # 并发请求数


# 论文配置
class PaperConfig(BaseModel):
    topic: str
    title: Optional[str] = None
    outline: Optional[List[str]] = None
    model_config: Optional[ModelConfig] = ModelConfig()
    api_config: Optional[APIConfig] = None
    custom_prompt: Optional[str] = None


# 全局变量，用于存储生成进度和部分内容
paper_generation_status = {
    "is_generating": False,
    "total_sections": 0,
    "completed_sections": 0,
    "current_section": "",
    "completed_content": [],
    "start_time": None,
    "estimated_time_remaining": None,
}


# 加载prompt模板
def load_prompt_templates():
    template_file = os.path.join(current_dir, "prompt_templates.json")
    if os.path.exists(template_file):
        with open(template_file, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        # 默认模板
        default_templates = {
            "title_prompt": "作为一个学术论文专家，请为以下主题生成一个专业的学术论文标题：\n主题：{topic}\n要求：\n1. 标题要专业、准确\n2. 标题要有学术性\n3. 标题长度适中\n请直接返回标题，不需要其他解释。",
            "title_suggestions_prompt": "作为一个学术论文专家，请为以下主题生成4个不同的专业学术论文标题建议：\n主题：{topic}\n要求：\n1. 标题要专业、准确\n2. 标题要有学术性\n3. 标题长度适中\n4. 每个标题要有不同的角度或侧重点\n请直接返回4个标题，每行一个，不需要编号或其他解释。",
            "outline_prompt": "作为一个学术论文专家，请为以下论文生成详细的目录大纲：\n主题：{topic}\n标题：{title}\n要求：\n1. 使用标准的学术论文结构\n2. 包含引言、文献综述、研究方法、结果分析、结论等主要部分\n3. 每个部分要有详细的子目录\n请直接返回目录大纲，每行一个条目，使用数字标记层级。",
            "section_prompt": "作为一个学术论文专家，请为以下论文生成一个章节的详细内容：\n主题：{topic}\n标题：{title}\n大纲：{outline_text}\n当前章节：{section}\n要求：\n1. 内容要专业、准确、有深度\n2. 使用学术语言和适当的术语\n3. 如果是方法或结果部分，要有具体的数据和分析\n4. 如果是引言或结论，要有清晰的论点和总结\n请直接返回该章节的完整内容，使用Markdown格式。",
        }
        # 保存默认模板
        with open(template_file, "w", encoding="utf-8") as f:
            json.dump(default_templates, f, ensure_ascii=False, indent=2)
        return default_templates


# 保存prompt模板
def save_prompt_templates(templates):
    template_file = os.path.join(current_dir, "prompt_templates.json")
    with open(template_file, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)


# 加载prompt模板
prompt_templates = load_prompt_templates()


class OpenAIClient:
    def __init__(self, api_config: APIConfig):
        self.client = AsyncOpenAI(
            api_key=api_config.api_key,
            base_url=api_config.base_url,
        )
        self.model = api_config.model_name

    async def generate_title(self, topic: str, config: ModelConfig) -> str:
        global prompt_templates
        prompt = prompt_templates["title_prompt"].format(topic=topic)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content or "生成失败，请重试"
        except Exception as e:
            print(f"Error generating title: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_title_suggestions(
        self, topic: str, config: ModelConfig
    ) -> List[str]:
        global prompt_templates
        prompt = prompt_templates["title_suggestions_prompt"].format(topic=topic)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature + 0.1,  # 稍微提高多样性
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            titles = response.choices[0].message.content.strip().split("\n")
            # 过滤掉空行和可能的编号
            titles = [t.strip() for t in titles if t.strip()]
            titles = [
                (
                    t[2:].strip()
                    if t[0].isdigit() and t[1] in [".", "、", "：", ":"]
                    else t
                )
                for t in titles
            ]
            return titles[:4]  # 最多返回4个
        except Exception as e:
            print(f"Error generating title suggestions: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_title_with_custom_prompt(
        self, topic: str, custom_prompt: str, config: ModelConfig
    ) -> str:
        prompt = custom_prompt.format(topic=topic)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content or "生成失败，请重试"
        except Exception as e:
            print(f"Error generating title with custom prompt: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_outline(
        self, topic: str, title: str, config: ModelConfig
    ) -> List[str]:
        global prompt_templates
        prompt = prompt_templates["outline_prompt"].format(topic=topic, title=title)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content.strip().split("\n")
        except Exception as e:
            print(f"Error generating outline: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_outline_with_custom_prompt(
        self, topic: str, title: str, custom_prompt: str, config: ModelConfig
    ) -> List[str]:
        prompt = custom_prompt.format(topic=topic, title=title)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content.strip().split("\n")
        except Exception as e:
            print(f"Error generating outline with custom prompt: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_section(
        self,
        topic: str,
        title: str,
        outline: List[str],
        section: str,
        config: ModelConfig,
    ) -> str:
        global prompt_templates
        outline_text = "\n".join(outline)
        prompt = prompt_templates["section_prompt"].format(
            topic=topic, title=title, outline_text=outline_text, section=section
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content or "生成失败，请重试"
        except Exception as e:
            print(f"Error generating section: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))


async def generate_paper_section(
    client: OpenAIClient,
    topic: str,
    title: str,
    outline: List[str],
    section: str,
    config: ModelConfig,
) -> str:
    return await client.generate_section(topic, title, outline, section, config)


# 打印初始状态
print(f"Initial paper_generation_status: {paper_generation_status}")


# 添加一个重置函数，确保状态正确重置
def reset_paper_generation_status():
    global paper_generation_status
    paper_generation_status["is_generating"] = False
    paper_generation_status["total_sections"] = 0
    paper_generation_status["completed_sections"] = 0
    paper_generation_status["current_section"] = ""
    paper_generation_status["completed_content"] = []
    paper_generation_status["start_time"] = None
    paper_generation_status["estimated_time_remaining"] = None
    print("Reset paper_generation_status to initial state")


@app.get("/api/config")
async def get_config():
    """获取初始配置"""
    print(f"OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY')}")
    print(f"OPENAI_BASE_URL: {os.getenv('OPENAI_BASE_URL')}")
    print(f"OPENAI_MODEL_NAME: {os.getenv('OPENAI_MODEL_NAME')}")

    return {
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "model_name": os.getenv("OPENAI_MODEL_NAME", "gpt-4-turbo-preview"),
    }


@app.post("/api/generate-title")
async def generate_title(config: PaperConfig):
    if not config.api_config:
        raise HTTPException(status_code=400, detail="API configuration is required")

    # 确保 api_config 和 model_config 是正确的对象类型
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")

    try:
        client = OpenAIClient(api_config)
        title = await client.generate_title(config.topic, model_config)
        return {"title": title}
    except Exception as e:
        print(f"Error in generate_title endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-outline")
async def generate_outline(config: PaperConfig):
    if not config.title or not config.api_config:
        raise HTTPException(
            status_code=400, detail="Title and API configuration are required"
        )

    # 将字典转换为对象（如果需要）
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")

    try:
        client = OpenAIClient(api_config)
        outline = await client.generate_outline(
            config.topic, config.title, model_config
        )
        return {"outline": outline}
    except Exception as e:
        print(f"Error in generate_outline endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-paper")
async def generate_paper(config: PaperConfig):
    global paper_generation_status

    if not config.title or not config.outline or not config.api_config:
        raise HTTPException(
            status_code=400, detail="Title, outline and API configuration are required"
        )

    # 将字典转换为对象（如果需要）
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")
    print(f"Outline length: {len(config.outline)}")
    print(f"Outline: {config.outline}")

    try:
        # 初始化生成状态
        paper_generation_status = {
            "is_generating": True,
            "total_sections": len(config.outline),
            "completed_sections": 0,
            "current_section": config.outline[0] if config.outline else "",
            "completed_content": [],
            "start_time": time.time(),
            "estimated_time_remaining": None,
        }

        print(f"Initialized paper_generation_status: {paper_generation_status}")

        client = OpenAIClient(api_config)
        sections = []
        tasks = []

        # 将大纲分成多个块
        chunks = [
            config.outline[i : i + model_config.concurrent_requests]
            for i in range(0, len(config.outline), model_config.concurrent_requests)
        ]

        print(f"Split outline into {len(chunks)} chunks")

        # 创建并发任务
        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)} with {len(chunk)} sections")
            chunk_tasks = []
            for section in chunk:
                paper_generation_status["current_section"] = section
                print(f"Creating task for section: {section}")
                task = generate_paper_section(
                    client,
                    config.topic,
                    config.title,
                    config.outline,
                    section,
                    model_config,
                )
                chunk_tasks.append(task)

            # 等待当前批次的任务完成
            print(f"Waiting for {len(chunk_tasks)} tasks to complete")
            section_contents = await asyncio.gather(*chunk_tasks)
            print(f"Completed {len(section_contents)} tasks")

            # 更新进度和内容
            for j, content in enumerate(section_contents):
                section_index = i * model_config.concurrent_requests + j
                if section_index < len(config.outline):
                    section_title = config.outline[section_index]
                    paper_generation_status["completed_sections"] += 1
                    paper_generation_status["completed_content"].append(
                        {"title": section_title, "content": content}
                    )

                    # 计算预估剩余时间
                    elapsed_time = time.time() - paper_generation_status["start_time"]
                    if paper_generation_status["completed_sections"] > 0:
                        avg_time_per_section = (
                            elapsed_time / paper_generation_status["completed_sections"]
                        )
                        remaining_sections = (
                            paper_generation_status["total_sections"]
                            - paper_generation_status["completed_sections"]
                        )
                        paper_generation_status["estimated_time_remaining"] = (
                            avg_time_per_section * remaining_sections
                        )

                    print(
                        f"Updated progress: {paper_generation_status['completed_sections']}/{paper_generation_status['total_sections']}"
                    )

            sections.extend(section_contents)

        # 合并所有章节
        full_paper = "\n\n".join(sections)
        print(f"Generated full paper with {len(full_paper)} characters")

        # 使用标题作为文件名（处理特殊字符）
        safe_title = (
            config.title.replace("/", "_")
            .replace("\\", "_")
            .replace(":", "_")
            .replace("*", "_")
            .replace("?", "_")
            .replace('"', "_")
            .replace("<", "_")
            .replace(">", "_")
            .replace("|", "_")
        )

        # 使用绝对路径保存文件
        md_file = os.path.join(current_dir, f"{safe_title}.md")
        with open(md_file, "w", encoding="utf-8") as f:
            f.write(f"# {config.title}\n\n")
            f.write(full_paper)

        print(f"Saved paper to {md_file}")

        # 转换为 docx
        docx_file = os.path.join(current_dir, f"{safe_title}.docx")
        subprocess.run(["pandoc", md_file, "-o", docx_file])
        print(f"Converted paper to {docx_file}")

        # 完成生成
        paper_generation_status["is_generating"] = False
        print("Paper generation completed")

        return {
            "paper": full_paper,
            "markdown_file": md_file,
            "docx_file": docx_file,
        }
    except Exception as e:
        # 发生错误时重置状态
        reset_paper_generation_status()  # 使用重置函数
        print(f"Error in generate_paper endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-title-suggestions")
async def generate_title_suggestions(config: PaperConfig):
    if not config.api_config:
        raise HTTPException(status_code=400, detail="API configuration is required")

    # 确保 api_config 和 model_config 是正确的对象类型
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")

    try:
        client = OpenAIClient(api_config)
        suggestions = await client.generate_title_suggestions(
            config.topic, model_config
        )
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"Error in generate_title_suggestions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-title-with-custom-prompt")
async def generate_title_with_custom_prompt(config: PaperConfig):
    if not config.api_config or not config.custom_prompt:
        raise HTTPException(
            status_code=400, detail="API configuration and custom prompt are required"
        )

    # 确保 api_config 和 model_config 是正确的对象类型
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")
    print(f"Custom Prompt: {config.custom_prompt}")

    try:
        client = OpenAIClient(api_config)
        title = await client.generate_title_with_custom_prompt(
            config.topic, config.custom_prompt, model_config
        )
        return {"title": title}
    except Exception as e:
        print(f"Error in generate_title_with_custom_prompt endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-outline-with-custom-prompt")
async def generate_outline_with_custom_prompt(config: PaperConfig):
    if not config.title or not config.api_config or not config.custom_prompt:
        raise HTTPException(
            status_code=400,
            detail="Title, API configuration and custom prompt are required",
        )

    # 确保 api_config 和 model_config 是正确的对象类型
    api_config = (
        APIConfig(**config.api_config)
        if isinstance(config.api_config, dict)
        else config.api_config
    )
    model_config = (
        ModelConfig(**config.model_config)
        if isinstance(config.model_config, dict)
        else config.model_config or ModelConfig()
    )

    # 调试输出
    print(f"API Config: {api_config}")
    print(f"Model Config: {model_config}")
    print(f"Custom Prompt: {config.custom_prompt}")

    try:
        client = OpenAIClient(api_config)
        outline = await client.generate_outline_with_custom_prompt(
            config.topic, config.title, config.custom_prompt, model_config
        )
        return {"outline": outline}
    except Exception as e:
        print(f"Error in generate_outline_with_custom_prompt endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/paper-generation-status")
async def get_paper_generation_status():
    global paper_generation_status

    # 打印当前状态
    print(f"Current paper_generation_status: {paper_generation_status}")

    # 计算已用时间
    elapsed_time = 0
    if paper_generation_status["start_time"]:
        elapsed_time = time.time() - paper_generation_status["start_time"]
        # 如果已经过去了很长时间（例如10分钟）但状态仍为生成中，强制重置
        if elapsed_time > 600 and paper_generation_status["is_generating"]:
            print("Forcing reset of paper_generation_status due to timeout")
            reset_paper_generation_status()

    # 计算进度百分比
    progress = 0
    if paper_generation_status["total_sections"] > 0:
        progress = (
            paper_generation_status["completed_sections"]
            / paper_generation_status["total_sections"]
        ) * 100

    response_data = {
        "is_generating": paper_generation_status["is_generating"],
        "progress": progress,
        "total_sections": paper_generation_status["total_sections"],
        "completed_sections": paper_generation_status["completed_sections"],
        "current_section": paper_generation_status["current_section"],
        "completed_content": paper_generation_status["completed_content"],
        "elapsed_time": elapsed_time,
        "estimated_time_remaining": paper_generation_status["estimated_time_remaining"],
    }

    print(f"Returning status: {response_data}")
    return response_data


@app.get("/api/prompt-templates")
async def get_prompt_templates():
    global prompt_templates
    return prompt_templates


@app.post("/api/prompt-templates")
async def update_prompt_templates(templates: dict):
    global prompt_templates
    # 确保所有必要的键都存在
    required_keys = [
        "title_prompt",
        "title_suggestions_prompt",
        "outline_prompt",
        "section_prompt",
    ]
    for key in required_keys:
        if key not in templates:
            raise HTTPException(
                status_code=400, detail=f"Missing required template: {key}"
            )

    # 更新模板
    prompt_templates = templates
    # 保存到文件
    save_prompt_templates(templates)
    return {"status": "success"}


# 添加重置生成状态的API端点
@app.post("/api/reset-generation-status")
async def reset_generation_status():
    reset_paper_generation_status()
    return {"status": "success", "message": "Generation status has been reset"}


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

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
