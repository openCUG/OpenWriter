# 论文工坊

这是一个基于 OpenAI API 的智能论文生成系统，可以根据用户输入的主题自动生成学术论文。

## 功能特点

- 根据主题自动生成专业的论文标题
- 智能生成论文大纲，支持自定义修改
- 基于大纲生成完整的论文内容
- 支持 Markdown 和 Word 格式导出
- 可配置的模型参数
- 并发生成加快处理速度

## 系统要求

- Python 3.10+
- Node.js 14+
- Pandoc

## 安装步骤

1. 克隆仓库：
```bash
git clone <repository-url>
cd llm_writers
```

2. 安装后端依赖：
```bash
pip install -r requirements.txt
```

3. 安装前端依赖：
```bash
cd frontend
npm install
```

4. 配置环境变量：
创建 `.env` 文件并添加以下内容：
```
ANTHROPIC_API_KEY=your_api_key_here
```

## 运行应用

1. 启动后端服务：
```bash
python main.py
```

2. 启动前端服务：
```bash
cd frontend
npm start
```

3. 访问应用：
打开浏览器访问 http://localhost:3000

## 使用说明

1. 输入论文主题
2. 系统生成标题，可以根据需要修改
3. 系统生成大纲，可以自定义调整
4. 确认后开始生成论文
5. 等待生成完成，下载 Markdown 或 Word 格式的论文

## 参数配置

可以在界面上调整以下参数：

- Temperature：控制输出的随机性
- Max Tokens：每次请求的最大 token 数量
- Top P：控制输出的多样性
- Chunk Size：每个生成块的大小
- 并发请求数：同时进行的 API 请求数量

## 注意事项

- 确保有足够的 API 配额
- 生成长文档可能需要较长时间
- 建议在生成过程中不要关闭浏览器

## 许可证

MIT 