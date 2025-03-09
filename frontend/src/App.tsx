import React, { useState, useEffect } from 'react';
import { Layout, Card, Steps, Button, message, Spin, Typography, theme, App as AntApp, Modal } from 'antd';
import { FileOutlined, RocketOutlined, SettingOutlined, EditOutlined, CodeOutlined } from '@ant-design/icons';
import TopicInput from './components/TopicInput';
import TitleEditor from './components/TitleEditor';
import OutlineEditor from './components/OutlineEditor';
import PaperGenerator from './components/PaperGenerator';
import ModelConfig from './components/ModelConfig';
import CustomPromptModal from './components/CustomPromptModal';
import PaperGenerationProgress from './components/PaperGenerationProgress';
import PromptTemplateEditor from './components/PromptTemplateEditor';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

interface APIConfigType {
  api_key: string;
  base_url: string;
  model_name: string;
}

interface ModelConfigType {
  temperature: number;
  max_tokens: number;
  top_p: number;
  chunk_size: number;
  concurrent_requests: number;
}

const initialApiConfig: APIConfigType = {
  api_key: '',
  base_url: 'https://api.openai.com/v1',
  model_name: 'gpt-4-turbo'
};

const initialModelConfig: ModelConfigType = {
  temperature: 0.7,
  max_tokens: 8192,
  top_p: 0.9,
  chunk_size: 15000,
  concurrent_requests: 64
};

const App: React.FC = () => {
  const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [outline, setOutline] = useState<string[]>([]);
  const [paper, setPaper] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  
  // 自定义prompt相关状态
  const [titlePromptModalVisible, setTitlePromptModalVisible] = useState(false);
  const [outlinePromptModalVisible, setOutlinePromptModalVisible] = useState(false);
  const [customPromptLoading, setCustomPromptLoading] = useState(false);
  
  // API配置
  const [apiConfig, setApiConfig] = useState<APIConfigType>(() => {
    // 尝试从localStorage加载配置
    const savedConfig = localStorage.getItem('apiConfig');
    return savedConfig ? JSON.parse(savedConfig) : initialApiConfig;
  });
  
  // 模型配置
  const [modelConfig, setModelConfig] = useState<ModelConfigType>(() => {
    // 尝试从localStorage加载配置
    const savedConfig = localStorage.getItem('modelConfig');
    return savedConfig ? JSON.parse(savedConfig) : initialModelConfig;
  });

  // 提示词模板编辑器状态
  const [promptEditorVisible, setPromptEditorVisible] = useState(false);

  // 加载初始配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/config');
        const data = await response.json();
        setApiConfig({
          api_key: data.api_key || '',
          base_url: data.base_url || 'https://api.openai.com/v1',
          model_name: data.model_name || 'gpt-4-turbo'
        });
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };
    fetchConfig();
  }, []);

  const steps = [
    {
      title: '输入主题',
      icon: <EditOutlined />,
      content: (
        <TopicInput 
          value={topic} 
          onChange={setTopic} 
          onSubmit={handleGenerateTitle}
          loading={loading}
        />
      ),
    },
    {
      title: '确认标题',
      icon: <FileOutlined />,
      content: (
        <TitleEditor 
          value={title} 
          onChange={setTitle} 
          onSubmit={handleGenerateOutline}
          loading={loading}
          titleSuggestions={titleSuggestions}
          onRefreshSuggestions={handleGenerateTitleSuggestions}
          suggestionsLoading={suggestionsLoading}
          onCustomPrompt={() => setTitlePromptModalVisible(true)}
        />
      ),
    },
    {
      title: '编辑大纲',
      icon: <SettingOutlined />,
      content: (
        <OutlineEditor 
          value={outline} 
          onChange={setOutline} 
          onSubmit={handleGeneratePaper}
          loading={loading}
          onCustomPrompt={() => setOutlinePromptModalVisible(true)}
        />
      ),
    },
    {
      title: '生成论文',
      icon: <RocketOutlined />,
      content: (
        <>
          <PaperGenerationProgress isGenerating={loading} />
          <PaperGenerator 
            paper={paper} 
            progress={progress}
            title={title}
          />
        </>
      ),
    },
  ];

  async function handleGenerateTitle() {
    if (!topic) {
      message.error('请输入论文主题');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setLoading(true);
    try {
      // 输出用于调试
      console.log('Sending request with:', {
        topic,
        api_config: apiConfig,
        model_config: modelConfig
      });
      
      const response = await fetch('http://localhost:8000/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          api_config: apiConfig,
          model_config: modelConfig
        }),
      });
      
      const data = await response.json();
      console.log('Received response:', data);
      
      if (response.ok) {
        setTitle(data.title);
        message.success('标题生成成功');
        setCurrent(1);
        
        // 生成标题后自动获取标题建议
        handleGenerateTitleSuggestions();
      } else {
        throw new Error(data.detail || data.message || JSON.stringify(data) || '生成失败');
      }
    } catch (error) {
      console.error('生成标题失败:', error);
      message.error(`生成标题失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateTitleSuggestions() {
    if (!topic) {
      message.error('主题不能为空');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setSuggestionsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-title-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          api_config: apiConfig,
          model_config: modelConfig
        }),
      });
      
      const data = await response.json();
      console.log('Received title suggestions:', data);
      
      if (response.ok) {
        setTitleSuggestions(data.suggestions);
      } else {
        throw new Error(data.detail || data.message || JSON.stringify(data) || '生成标题建议失败');
      }
    } catch (error) {
      console.error('生成标题建议失败:', error);
      message.error(`生成标题建议失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function handleGenerateOutline() {
    if (!title) {
      message.error('请输入论文标题');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setLoading(true);
    try {
      // 输出用于调试
      console.log('Sending outline request with:', {
        topic,
        title,
        api_config: apiConfig,
        model_config: modelConfig
      });
      
      const response = await fetch('http://localhost:8000/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          title,
          api_config: apiConfig,
          model_config: modelConfig
        }),
      });
      
      const data = await response.json();
      console.log('Received outline response:', data);
      
      if (response.ok) {
        setOutline(data.outline);
        message.success('大纲生成成功');
        setCurrent(2);
      } else {
        throw new Error(data.detail || data.message || JSON.stringify(data) || '生成失败');
      }
    } catch (error) {
      console.error('生成大纲失败:', error);
      message.error(`生成大纲失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePaper() {
    if (!outline || outline.length === 0) {
      message.error('请生成或编辑论文大纲');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setLoading(true);
    setProgress(0);
    setPaper('');
    setCurrent(3); // 立即切换到生成论文页面，这样用户可以看到进度
    
    try {
      // 输出用于调试
      console.log('Sending paper request with:', {
        topic,
        title,
        outline,
        api_config: apiConfig,
        model_config: modelConfig
      });
      
      // 发送生成请求
      const response = await fetch('http://localhost:8000/api/generate-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          title,
          outline,
          api_config: apiConfig,
          model_config: modelConfig
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaper(data.paper);
        message.success('论文生成成功');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || '生成失败');
      }
    } catch (error) {
      console.error('生成论文失败:', error);
      message.error(`生成论文失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setLoading(false);
    }
  }

  const handleConfigChange = (newApiConfig: APIConfigType, newModelConfig: ModelConfigType) => {
    setApiConfig(newApiConfig);
    setModelConfig(newModelConfig);
    
    // 保存配置到localStorage
    localStorage.setItem('apiConfig', JSON.stringify(newApiConfig));
    localStorage.setItem('modelConfig', JSON.stringify(newModelConfig));
    
    // 显示提示
    message.success('配置已更新');
  };

  const contentStyle: React.CSSProperties = {
    minHeight: 'calc(100vh - 64px - 69px)',
    padding: '24px',
    marginTop: '64px',
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
  };

  async function handleGenerateTitleWithCustomPrompt(customPrompt: string) {
    if (!topic) {
      message.error('主题不能为空');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setCustomPromptLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-title-with-custom-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          api_config: apiConfig,
          model_config: modelConfig,
          custom_prompt: customPrompt
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTitle(data.title);
        message.success('标题已根据自定义要求生成');
        setTitlePromptModalVisible(false);
      } else {
        throw new Error(data.detail || data.message || JSON.stringify(data) || '生成失败');
      }
    } catch (error) {
      console.error('生成自定义标题失败:', error);
      message.error(`生成失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setCustomPromptLoading(false);
    }
  }
  
  async function handleGenerateOutlineWithCustomPrompt(customPrompt: string) {
    if (!title) {
      message.error('标题不能为空');
      return;
    }
    
    // 检查API密钥是否存在
    if (!apiConfig.api_key) {
      message.error('请在高级配置中设置API密钥');
      return;
    }
    
    setCustomPromptLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-outline-with-custom-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          title,
          api_config: apiConfig,
          model_config: modelConfig,
          custom_prompt: customPrompt
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOutline(data.outline);
        message.success('大纲已根据自定义要求生成');
        setOutlinePromptModalVisible(false);
      } else {
        throw new Error(data.detail || data.message || JSON.stringify(data) || '生成失败');
      }
    } catch (error) {
      console.error('生成自定义大纲失败:', error);
      message.error(`生成失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setCustomPromptLoading(false);
    }
  }

  // 打开提示词模板编辑器
  const handleOpenPromptEditor = () => {
    setPromptEditorVisible(true);
  };
  
  // 关闭提示词模板编辑器
  const handleClosePromptEditor = () => {
    setPromptEditorVisible(false);
  };

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          position: 'fixed', 
          zIndex: 1, 
          width: '100%', 
          padding: '0 50px',
          display: 'flex',
          alignItems: 'center',
          background: token.colorPrimary
        }}>
          <Title level={3} style={{ margin: 0, color: 'white', flex: 1 }}>
            思想工坊 | ThoughtCraft
          </Title>
          <Button 
            type="text" 
            icon={<CodeOutlined />} 
            onClick={handleOpenPromptEditor}
            style={{ color: 'white' }}
          >
            提示词模板
          </Button>
        </Header>
        
        <Content style={{ padding: '0 50px', marginTop: 64 }}>
          <div style={contentStyle}>
            <div style={{ marginBottom: 24 }}>
              <Card bordered={false} style={{ marginBottom: 24, boxShadow: token.boxShadow }}>
                <Steps
                  current={current}
                  items={steps.map(item => ({
                    title: item.title,
                    icon: item.icon
                  }))}
                />
              </Card>

              <Card 
                bordered={false} 
                style={{ 
                  marginBottom: 24,
                  minHeight: 400,
                  boxShadow: token.boxShadow
                }}
              >
                <Spin spinning={loading} tip="处理中...">
                  {steps[current].content}
                </Spin>
              </Card>
              
              <Card 
                title={<><SettingOutlined /> 高级配置</>}
                bordered={false}
                style={{ boxShadow: token.boxShadow }}
              >
                <ModelConfig 
                  apiConfig={apiConfig}
                  modelConfig={modelConfig}
                  onChange={handleConfigChange}
                />
              </Card>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                {current > 0 && (
                  <Button 
                    style={{ margin: '0 8px' }} 
                    onClick={() => setCurrent(current - 1)}
                  >
                    上一步
                  </Button>
                )}
                <div style={{ flex: 1 }}></div>
                {current < steps.length - 1 && current !== 2 && (
                  <Button 
                    type="primary" 
                    onClick={current === 0 ? handleGenerateTitle : handleGenerateOutline}
                    loading={loading}
                  >
                    下一步
                  </Button>
                )}
                {current === 2 && (
                  <Button 
                    type="primary" 
                    onClick={handleGeneratePaper}
                    loading={loading}
                  >
                    生成论文
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          <Text type="secondary">论文工坊 | ThoughtCraft ©2025 基于大语言模型技术</Text>
        </Footer>
      </Layout>
      
      {/* 自定义Prompt模态框 */}
      <CustomPromptModal
        visible={titlePromptModalVisible}
        onClose={() => setTitlePromptModalVisible(false)}
        onSubmit={handleGenerateTitleWithCustomPrompt}
        loading={customPromptLoading}
        title="自定义标题生成指令"
        defaultPrompt={`请为主题"${topic}"生成一个更加学术化、专业的标题。`}
        type="title"
      />
      
      <CustomPromptModal
        visible={outlinePromptModalVisible}
        onClose={() => setOutlinePromptModalVisible(false)}
        onSubmit={handleGenerateOutlineWithCustomPrompt}
        loading={customPromptLoading}
        title="自定义大纲生成指令"
        defaultPrompt={`请为标题"${title}"生成一个详细的学术论文大纲，确保包含完整的研究方法和结果分析部分。`}
        type="outline"
      />
      
      {/* 提示词模板编辑器模态框 */}
      <Modal
        title={null}
        open={promptEditorVisible}
        onCancel={handleClosePromptEditor}
        footer={null}
        width={800}
        bodyStyle={{ padding: 0 }}
        destroyOnClose
      >
        <PromptTemplateEditor onClose={handleClosePromptEditor} />
      </Modal>
    </AntApp>
  );
};

export default App; 