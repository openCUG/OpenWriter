from openai import AsyncOpenAI
from fastapi import HTTPException
import re
from typing import List
from models import APIConfig, ModelConfig
from utils import prompt_templates


class OpenAIClient:
    def __init__(self, api_config: APIConfig):
        self.client = AsyncOpenAI(
            api_key=api_config.api_key,
            base_url=api_config.base_url,
        )
        self.model = api_config.model_name

    def build_system_prompt(self, prompt_type: str) -> str:
        """从format_requirements构建系统提示"""
        global prompt_templates

        role_map = {
            "title": "学术论文标题生成助手",
            "title_suggestions": "学术论文标题生成助手",
            "outline": "学术论文大纲生成助手",
            "section": "学术论文内容生成助手",
        }

        # 获取角色
        role = role_map.get(prompt_type, "学术论文助手")

        # 获取格式要求
        requirements = prompt_templates["format_requirements"].get(prompt_type, [])

        # 构建基本要求
        base_requirements = []
        if prompt_type in ["title", "title_suggestions"]:
            # 标题类型的提示都需要包含标题的基本要求
            base_requirements = prompt_templates["format_requirements"]["title"]

            # 如果是标题建议，还需要添加特定要求
            if prompt_type == "title_suggestions":
                base_requirements = (
                    base_requirements
                    + prompt_templates["format_requirements"]["title_suggestions"]
                )
        else:
            base_requirements = requirements

        # 添加额外的输出格式要求
        if prompt_type == "title":
            base_requirements.append("只返回标题本身，不需要其他解释")
        elif prompt_type == "title_suggestions":
            base_requirements.append("每行一个标题，不需要编号或其他解释")
        elif prompt_type == "outline":
            base_requirements.append("直接返回目录大纲，不需要其他解释")
        elif prompt_type == "section":
            base_requirements.append("直接返回该章节的完整内容，不需要其他解释")

        # 构建系统提示
        system_prompt = f"你是一个专业的{role}。\n请遵循以下格式要求："

        for i, req in enumerate(base_requirements, 1):
            system_prompt += f"\n{i}. {req}"

        return system_prompt

    async def generate_title(self, topic: str, config: ModelConfig) -> str:
        global prompt_templates

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("title")
        messages.append({"role": "system", "content": system_prompt})

        # 用户提示
        prompt = prompt_templates["title_prompt"].format(topic=topic)
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            title = response.choices[0].message.content or "生成失败，请重试"

            return title
        except Exception as e:
            print(f"Error generating title: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_title_suggestions(
        self, topic: str, config: ModelConfig
    ) -> List[str]:
        global prompt_templates

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("title_suggestions")
        messages.append({"role": "system", "content": system_prompt})

        # 用户提示
        prompt = prompt_templates["title_suggestions_prompt"].format(topic=topic)
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature + 0.1,  # 稍微提高多样性
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            titles_text = response.choices[0].message.content.strip()

            # 处理标题格式
            titles = titles_text.split("\n")
            cleaned_titles = []

            for title in titles:
                title = title.strip()
                if not title:
                    continue

                # 移除可能的编号
                title = re.sub(r"^(\d+[\.\、\:])\s*", "", title)

                cleaned_titles.append(title)

            return cleaned_titles[:4]  # 最多返回4个
        except Exception as e:
            print(f"Error generating title suggestions: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_title_with_custom_prompt(
        self,
        topic: str,
        custom_prompt: str,
        config: ModelConfig,
        is_new_generation: bool = False,
        current_title: str = "",
    ) -> str:
        global prompt_templates

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("title")
        messages.append({"role": "system", "content": system_prompt})

        # 根据是否全新生成构建提示词
        if is_new_generation:
            # 全新生成
            prompt = f"{custom_prompt}"
        else:
            # 在已有内容基础上修改
            if current_title:
                prompt = f"当前标题是：{current_title}\n\n根据以下指令修改标题：\n{custom_prompt}\n\n主题：{topic}"
            else:
                prompt = f"{custom_prompt.format(topic=topic)}"

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            title = response.choices[0].message.content or "生成失败，请重试"

            return title
        except Exception as e:
            print(f"Error generating title with custom prompt: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_outline(
        self, topic: str, title: str, config: ModelConfig
    ) -> List[str]:
        global prompt_templates

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("outline")
        messages.append({"role": "system", "content": system_prompt})

        # 用户提示
        prompt = prompt_templates["outline_prompt"].format(topic=topic, title=title)
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            outline_text = response.choices[0].message.content.strip()

            # 处理大纲格式，确保每行是一个条目，但保留编号和层级标记
            outline_lines = outline_text.split("\n")
            cleaned_outline = []

            for line in outline_lines:
                line = line.strip()
                if not line:
                    continue

                # 不再移除编号和项目符号，保留原始格式
                cleaned_outline.append(line)

            return cleaned_outline
        except Exception as e:
            print(f"Error generating outline: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_outline_with_custom_prompt(
        self,
        topic: str,
        title: str,
        custom_prompt: str,
        config: ModelConfig,
        is_new_generation: bool = False,
        current_outline: List[str] = [],
    ) -> List[str]:
        global prompt_templates

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("outline")
        messages.append({"role": "system", "content": system_prompt})

        # 根据是否全新生成构建提示词
        if is_new_generation:
            # 全新生成
            prompt = f"{custom_prompt}\n\n请确保每个大纲条目单独占一行，并严格按照以下格式标记层级：\n- 第一级标题使用数字加点，如：1. 引言\n- 第二级标题使用数字加点，如：1.1 研究背景\n- 第三级标题使用数字加点，如：1.1.1 研究问题\n- 确保每个编号后有一个空格\n- 不要使用其他格式的编号"
        else:
            # 在已有内容基础上修改
            if current_outline:
                current_outline_text = "\n".join(current_outline)
                prompt = f"当前大纲是：\n\n{current_outline_text}\n\n根据以下指令修改大纲：\n{custom_prompt}\n\n主题：{topic}\n标题：{title}\n\n请确保每个大纲条目单独占一行，并严格按照以下格式标记层级：\n- 第一级标题使用数字加点，如：1. 引言\n- 第二级标题使用数字加点，如：1.1 研究背景\n- 第三级标题使用数字加点，如：1.1.1 研究问题\n- 确保每个编号后有一个空格\n- 不要使用其他格式的编号"
            else:
                prompt = f"{custom_prompt.format(topic=topic, title=title)}\n\n请确保每个大纲条目单独占一行，并严格按照以下格式标记层级：\n- 第一级标题使用数字加点，如：1. 引言\n- 第二级标题使用数字加点，如：1.1 研究背景\n- 第三级标题使用数字加点，如：1.1.1 研究问题\n- 确保每个编号后有一个空格\n- 不要使用其他格式的编号"

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            outline_text = response.choices[0].message.content.strip()

            # 处理大纲格式，确保每行是一个条目，但保留编号和层级标记
            outline_lines = outline_text.split("\n")
            cleaned_outline = []

            for line in outline_lines:
                line = line.strip()
                if not line:
                    continue

                # 不再移除编号和项目符号，保留原始格式
                cleaned_outline.append(line)

            return cleaned_outline
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

        messages = []

        # 构建系统提示
        system_prompt = self.build_system_prompt("section")
        messages.append({"role": "system", "content": system_prompt})

        # 用户提示
        outline_text = "\n".join(outline)
        prompt = prompt_templates["section_prompt"].format(
            topic=topic, title=title, outline_text=outline_text, section=section
        )
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
            )
            return response.choices[0].message.content or "生成失败，请重试"
        except Exception as e:
            print(f"Error generating section: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
