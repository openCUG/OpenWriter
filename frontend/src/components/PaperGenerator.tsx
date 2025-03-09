import React, { useState } from 'react';
import { Typography, Card, Progress, Button, Space, Tabs, Divider, message } from 'antd';
import { DownloadOutlined, CopyOutlined, FileWordOutlined, CodeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface PaperGeneratorProps {
  paper: string;
  progress: number;
  title: string;
}

const PaperGenerator: React.FC<PaperGeneratorProps> = ({ paper, progress, title }) => {
  const [activeTab, setActiveTab] = useState('preview');
  
  const getSafeFileName = (fileName: string): string => {
    return fileName.replace(/[/\\:*?"<>|]/g, '_');
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(paper)
      .then(() => {
        message.success('内容已复制到剪贴板！');
      })
      .catch(err => {
        console.error('复制失败:', err);
        message.error('复制失败，请手动选择文本复制');
      });
  };
  
  const handleDownloadMarkdown = () => {
    const safeTitle = getSafeFileName(title || '论文');
    const element = document.createElement('a');
    const file = new Blob([paper], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${safeTitle}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const handleDownloadWord = () => {
    const safeTitle = getSafeFileName(title || '论文');
    const docxUrl = `http://localhost:8000/static/${safeTitle}.docx`;
    
    fetch(docxUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('文件下载失败');
        }
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${safeTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Word文档下载成功');
      })
      .catch(error => {
        console.error('下载失败:', error);
        message.error('Word文档下载失败，请稍后重试');
      });
  };
  
  if (!paper) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Progress type="circle" percent={progress} />
        <Paragraph style={{ marginTop: 20 }}>
          正在生成论文，请耐心等待...
        </Paragraph>
      </div>
    );
  }
  
  return (
    <div>
      <Title level={4}>论文已生成</Title>
      <Paragraph>
        您的论文已经生成完毕。您可以在下方预览，或者下载为 Markdown 或 Word 格式。
      </Paragraph>
      
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={handleDownloadMarkdown}
        >
          下载 Markdown
        </Button>
        <Button 
          icon={<FileWordOutlined />} 
          onClick={handleDownloadWord}
        >
          导出 Word
        </Button>
        <Button 
          icon={<CopyOutlined />} 
          onClick={handleCopyToClipboard}
        >
          复制内容
        </Button>
      </Space>
      
      <Card bordered={false} style={{ marginTop: 16 }} className="fadeIn">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'preview',
              label: '预览',
              children: (
                <div className="markdown-preview" style={{ maxHeight: '60vh', overflow: 'auto', padding: '0 20px' }}>
                  {paper ? (
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        h1: ({node, ...props}) => <h1 style={{borderBottom: '1px solid #eaecef', paddingBottom: '0.3em'}} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{borderBottom: '1px solid #eaecef', paddingBottom: '0.3em'}} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{marginTop: '1.5em'}} {...props} />,
                        p: ({node, ...props}) => <p style={{lineHeight: '1.6', marginBottom: '1em'}} {...props} />,
                        ul: ({node, ...props}) => <ul style={{paddingLeft: '2em'}} {...props} />,
                        ol: ({node, ...props}) => <ol style={{paddingLeft: '2em'}} {...props} />,
                        li: ({node, ...props}) => <li style={{marginBottom: '0.5em'}} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #dfe2e5', paddingLeft: '1em', color: '#6a737d'}} {...props} />,
                        code: ({node, inline, className, ...props}: any) => 
                          inline 
                            ? <code style={{background: '#f6f8fa', padding: '0.2em 0.4em', borderRadius: '3px'}} {...props} />
                            : <code style={{display: 'block', background: '#f6f8fa', padding: '1em', borderRadius: '5px', overflowX: 'auto'}} {...props} />
                      }}
                    >
                      {paper}
                    </ReactMarkdown>
                  ) : (
                    <p>暂无内容</p>
                  )}
                </div>
              ),
            },
            {
              key: 'source',
              label: '源代码',
              children: (
                <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                  <pre style={{ 
                    backgroundColor: '#f6f8fa', 
                    padding: '16px', 
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowX: 'auto',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}>
                    {paper}
                  </pre>
                </div>
              ),
            }
          ]}
        />
      </Card>
      
      <Divider />
      
      <Card
        title={<span><CodeOutlined /> 提示</span>}
        size="small"
        className="fadeIn"
        style={{ backgroundColor: '#f9f9f9' }}
      >
        <Text type="secondary">
          您可以将生成的内容复制到您喜欢的编辑器中进行进一步编辑和格式调整。
          如有需要，您也可以返回修改大纲，重新生成内容。
        </Text>
      </Card>
    </div>
  );
};

export default PaperGenerator; 