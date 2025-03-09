import os
import json
import time
import re
from pathlib import Path

# 确保当前目录存在
current_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(current_dir, exist_ok=True)

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
            "outline_prompt": "作为一个学术论文专家，请为以下论文生成详细的目录大纲：\n主题：{topic}\n标题：{title}\n要求：\n1. 使用标准的学术论文结构\n2. 包含引言、文献综述、研究方法、结果分析、结论等主要部分\n3. 每个部分要有详细的子目录\n4. 严格按照以下格式标记层级：\n   - 第一级标题使用数字加点，如：1. 引言\n   - 第二级标题使用数字加点，如：1.1 研究背景\n   - 第三级标题使用数字加点，如：1.1.1 研究问题\n   - 确保每个编号后有一个空格\n   - 不要使用其他格式的编号\n\n请直接返回目录大纲，每行一个条目，确保层级清晰。",
            "section_prompt": "作为一个学术论文专家，请为以下论文生成一个章节的详细内容：\n主题：{topic}\n标题：{title}\n大纲：{outline_text}\n当前章节：{section}\n要求：\n1. 内容要专业、准确、有深度\n2. 使用学术语言和适当的术语\n3. 如果是方法或结果部分，要有具体的数据和分析\n4. 如果是引言或结论，要有清晰的论点和总结\n请直接返回该章节的完整内容，使用Markdown格式。",
            "format_requirements": {
                "title": ["标题要专业、准确", "标题要有学术性", "标题长度适中"],
                "title_suggestions": [
                    "每个标题要有不同的角度或侧重点",
                    "生成4个不同的标题建议",
                ],
                "outline": [
                    "使用标准的学术论文结构",
                    "包含引言、文献综述、研究方法、结果分析、结论等主要部分",
                    "每个部分要有详细的子目录",
                    "严格使用数字编号格式：1., 1.1, 1.1.1等，确保每个编号后有一个空格",
                ],
                "section": [
                    "内容要专业、准确、有深度",
                    "使用学术语言和适当的术语",
                    "如果是方法或结果部分，要有具体的数据和分析",
                    "如果是引言或结论，要有清晰的论点和总结",
                ],
            },
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


# 添加一个重置函数，确保状态正确重置
def reset_paper_generation_status():
    global paper_generation_status
    paper_generation_status["is_generating"] = False
    paper_generation_status["total_sections"] = 0
    paper_generation_status["completed_sections"] = 0
    paper_generation_status["current_section"] = ""
    paper_generation_status["completed_content"] = []
    paper_generation_status["start_time"] = None
    paper_generation_status["estimated_time_remaining"] = 0  # 设置为0而不是None
    print("Reset paper_generation_status to initial state")


# 加载prompt模板
prompt_templates = load_prompt_templates()
