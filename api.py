from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
import time
import subprocess
from typing import List, Dict, Any

from models import APIConfig, ModelConfig, PaperConfig
from openai_client import OpenAIClient
from utils import (
    current_dir,
    paper_generation_status,
    prompt_templates,
    reset_paper_generation_status,
    save_prompt_templates,
)

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def generate_paper_section(
    client: OpenAIClient,
    topic: str,
    title: str,
    outline: List[str],
    section: str,
    config: ModelConfig,
) -> str:
    return await client.generate_section(topic, title, outline, section, config)


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
    print(f"Is New Generation: {config.is_new_generation}")
    print(f"Current Title: {config.title}")

    try:
        client = OpenAIClient(api_config)
        title = await client.generate_title_with_custom_prompt(
            config.topic,
            config.custom_prompt,
            model_config,
            config.is_new_generation,
            config.title,
        )
        return {"title": title}
    except Exception as e:
        print(f"Error in generate_title_with_custom_prompt endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-outline-with-custom-prompt")
async def generate_outline_with_custom_prompt(config: PaperConfig):
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
    print(f"Is New Generation: {config.is_new_generation}")
    print(f"Current Title: {config.title}")
    print(f"Current Outline: {config.outline}")

    try:
        client = OpenAIClient(api_config)
        outline = await client.generate_outline_with_custom_prompt(
            config.topic,
            config.title,
            config.custom_prompt,
            model_config,
            config.is_new_generation,
            config.outline,
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

    # 处理剩余时间
    estimated_time_remaining = paper_generation_status["estimated_time_remaining"]
    # 如果生成已完成，剩余时间设为0
    if not paper_generation_status["is_generating"] and progress >= 100:
        estimated_time_remaining = 0

    response_data = {
        "is_generating": paper_generation_status["is_generating"],
        "progress": progress,
        "total_sections": paper_generation_status["total_sections"],
        "completed_sections": paper_generation_status["completed_sections"],
        "current_section": paper_generation_status["current_section"],
        "completed_content": paper_generation_status["completed_content"],
        "elapsed_time": elapsed_time,
        "estimated_time_remaining": estimated_time_remaining,
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
