import React, { useState, useEffect } from 'react';
import { Form, Input, Slider, InputNumber, Tabs, Row, Col, Typography } from 'antd';
import { KeyOutlined, SettingOutlined, ApiOutlined, RobotOutlined } from '@ant-design/icons';

const { Text } = Typography;

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

interface ModelConfigProps {
  apiConfig: APIConfigType;
  modelConfig: ModelConfigType;
  onChange: (apiConfig: APIConfigType, modelConfig: ModelConfigType) => void;
}

const ModelConfig: React.FC<ModelConfigProps> = ({ apiConfig, modelConfig, onChange }) => {
  const [form] = Form.useForm();
  const [localApiConfig, setLocalApiConfig] = useState<APIConfigType>(apiConfig);
  const [localModelConfig, setLocalModelConfig] = useState<ModelConfigType>(modelConfig);

  // 同步外部配置到本地状态
  useEffect(() => {
    setLocalApiConfig(apiConfig);
    setLocalModelConfig(modelConfig);
    form.setFieldsValue({
      ...apiConfig,
      ...modelConfig,
    });
  }, [apiConfig, modelConfig, form]);

  // 更新配置
  const handleChange = (fieldName: string, value: any) => {
    if (['api_key', 'base_url', 'model_name'].includes(fieldName)) {
      const newApiConfig = { ...localApiConfig, [fieldName]: value };
      setLocalApiConfig(newApiConfig);
      onChange(newApiConfig, localModelConfig);
    } else {
      const newModelConfig = { ...localModelConfig, [fieldName]: value };
      setLocalModelConfig(newModelConfig);
      onChange(localApiConfig, newModelConfig);
    }
  };

  const items = [
    {
      key: 'api',
      label: <span><ApiOutlined /> API 配置</span>,
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label={<span><KeyOutlined /> API 密钥</span>} name="api_key">
              <Input.Password 
                placeholder="输入您的 OpenAI API 密钥" 
                onChange={(e) => handleChange('api_key', e.target.value)}
                value={localApiConfig.api_key}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Base URL" name="base_url">
              <Input 
                placeholder="https://api.openai.com/v1" 
                onChange={(e) => handleChange('base_url', e.target.value)}
                value={localApiConfig.base_url}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<span><RobotOutlined /> 模型名称</span>} name="model_name">
              <Input 
                placeholder="gpt-4-turbo" 
                onChange={(e) => handleChange('model_name', e.target.value)}
                value={localApiConfig.model_name}
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'model',
      label: <span><SettingOutlined /> 模型参数</span>,
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label={<span>Temperature <Text type="secondary">(更高=更随机)</Text></span>}
              name="temperature"
            >
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={localModelConfig.temperature}
                onChange={(value) => handleChange('temperature', value)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label={<span>Top P <Text type="secondary">(文本多样性)</Text></span>} 
              name="top_p"
            >
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={localModelConfig.top_p}
                onChange={(value) => handleChange('top_p', value)}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              label="每次生成 Token 数" 
              name="max_tokens"
            >
              <InputNumber
                min={1000}
                max={8000}
                value={localModelConfig.max_tokens}
                onChange={(value) => handleChange('max_tokens', value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              label="每个块的大小" 
              name="chunk_size"
            >
              <InputNumber
                min={1000}
                max={30000}
                value={localModelConfig.chunk_size}
                onChange={(value) => handleChange('chunk_size', value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              label="并发请求数" 
              name="concurrent_requests"
            >
              <InputNumber
                min={1}
                max={100}
                value={localModelConfig.concurrent_requests}
                onChange={(value) => handleChange('concurrent_requests', value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    }
  ];

  return (
    <Form form={form} layout="vertical" initialValues={{ ...localApiConfig, ...localModelConfig }}>
      <Tabs items={items} />
    </Form>
  );
};

export default ModelConfig; 