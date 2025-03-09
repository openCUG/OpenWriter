import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Tabs, Typography, Tooltip, Space, Divider, Modal } from 'antd';
import { SaveOutlined, ReloadOutlined, InfoCircleOutlined, CodeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface PromptTemplates {
  title_prompt: string;
  title_suggestions_prompt: string;
  outline_prompt: string;
  section_prompt: string;
}

interface PromptTemplateEditorProps {
  onClose: () => void;
}

const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<PromptTemplates>({
    title_prompt: '',
    title_suggestions_prompt: '',
    outline_prompt: '',
    section_prompt: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载模板
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/prompt-templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        } else {
          message.error('加载提示词模板失败');
        }
      } catch (error) {
        console.error('加载提示词模板失败:', error);
        message.error('加载提示词模板失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // 保存模板
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/prompt-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templates),
      });

      if (response.ok) {
        message.success('提示词模板保存成功');
        onClose();
      } else {
        const data = await response.json();
        message.error(`保存失败: ${data.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('保存提示词模板失败:', error);
      message.error('保存提示词模板失败，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  // 重置模板
  const handleReset = async () => {
    Modal.confirm({
      title: '确认重置',
      icon: <ExclamationCircleOutlined />,
      content: '确定要重置所有提示词模板吗？这将恢复默认设置。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await fetch('http://localhost:8000/api/prompt-templates');
          if (response.ok) {
            const data = await response.json();
            setTemplates(data);
            message.success('提示词模板已重置');
          } else {
            message.error('重置提示词模板失败');
          }
        } catch (error) {
          console.error('重置提示词模板失败:', error);
          message.error('重置提示词模板失败，请检查网络连接');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleChange = (key: keyof PromptTemplates, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderPlaceholderInfo = (type: 'title' | 'outline' | 'section') => {
    let placeholders: string[] = [];
    
    if (type === 'title') {
      placeholders = ['{topic}'];
    } else if (type === 'outline') {
      placeholders = ['{topic}', '{title}'];
    } else if (type === 'section') {
      placeholders = ['{topic}', '{title}', '{outline_text}', '{section}'];
    }
    
    return (
      <Paragraph>
        <Text strong>可用的占位符：</Text>
        <ul>
          {placeholders.map(p => (
            <li key={p}><code>{p}</code></li>
          ))}
        </ul>
      </Paragraph>
    );
  };

  return (
    <Card
      title={
        <Space>
          <CodeOutlined />
          <span>提示词模板编辑器</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            loading={loading}
          >
            重置
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      }
      style={{ width: '100%', marginBottom: 24 }}
    >
      <Paragraph>
        <InfoCircleOutlined style={{ marginRight: 8 }} />
        <Text type="secondary">
          您可以自定义AI生成内容时使用的提示词模板。这些模板将用于生成标题、大纲和论文内容。
          请确保保留必要的占位符，它们将在生成时被替换为实际内容。
        </Text>
      </Paragraph>
      
      <Divider />
      
      <Tabs defaultActiveKey="title">
        <TabPane tab="标题生成" key="title">
          <Form layout="vertical">
            <Form.Item 
              label={
                <Tooltip title="用于生成单个标题的提示词">
                  <Space>
                    <span>标题生成提示词</span>
                    <InfoCircleOutlined />
                  </Space>
                </Tooltip>
              }
            >
              <TextArea
                value={templates.title_prompt}
                onChange={(e) => handleChange('title_prompt', e.target.value)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                placeholder="请输入标题生成提示词..."
              />
            </Form.Item>
            
            <Form.Item 
              label={
                <Tooltip title="用于生成多个标题建议的提示词">
                  <Space>
                    <span>标题建议提示词</span>
                    <InfoCircleOutlined />
                  </Space>
                </Tooltip>
              }
            >
              <TextArea
                value={templates.title_suggestions_prompt}
                onChange={(e) => handleChange('title_suggestions_prompt', e.target.value)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                placeholder="请输入标题建议提示词..."
              />
            </Form.Item>
            
            {renderPlaceholderInfo('title')}
          </Form>
        </TabPane>
        
        <TabPane tab="大纲生成" key="outline">
          <Form layout="vertical">
            <Form.Item 
              label={
                <Tooltip title="用于生成论文大纲的提示词">
                  <Space>
                    <span>大纲生成提示词</span>
                    <InfoCircleOutlined />
                  </Space>
                </Tooltip>
              }
            >
              <TextArea
                value={templates.outline_prompt}
                onChange={(e) => handleChange('outline_prompt', e.target.value)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                placeholder="请输入大纲生成提示词..."
              />
            </Form.Item>
            
            {renderPlaceholderInfo('outline')}
          </Form>
        </TabPane>
        
        <TabPane tab="章节生成" key="section">
          <Form layout="vertical">
            <Form.Item 
              label={
                <Tooltip title="用于生成论文章节内容的提示词">
                  <Space>
                    <span>章节生成提示词</span>
                    <InfoCircleOutlined />
                  </Space>
                </Tooltip>
              }
            >
              <TextArea
                value={templates.section_prompt}
                onChange={(e) => handleChange('section_prompt', e.target.value)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                placeholder="请输入章节生成提示词..."
              />
            </Form.Item>
            
            {renderPlaceholderInfo('section')}
          </Form>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default PromptTemplateEditor; 