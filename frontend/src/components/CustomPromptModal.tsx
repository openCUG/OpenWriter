import React, { useState } from 'react';
import { Modal, Input, Button, Typography, Space } from 'antd';
import { EditOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface CustomPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  loading: boolean;
  title: string;
  defaultPrompt: string;
  type: 'title' | 'outline';
}

const CustomPromptModal: React.FC<CustomPromptModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading,
  title,
  defaultPrompt,
  type
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt);

  const handleSubmit = () => {
    onSubmit(prompt);
  };

  const getPlaceholder = () => {
    if (type === 'title') {
      return '例如：请为我生成一个更加学术化、包含"创新"和"分析"关键词的标题';
    } else {
      return '例如：请调整大纲，增加更多关于研究方法的内容，并确保每个部分有至少3个子部分';
    }
  };

  const getDescription = () => {
    if (type === 'title') {
      return '您可以在这里输入自定义指令来调整标题。系统会根据您的指令和原始主题生成新的标题。';
    } else {
      return '您可以在这里输入自定义指令来调整大纲。系统会根据您的指令、主题和标题生成新的大纲。';
    }
  };

  return (
    <Modal
      title={<span><EditOutlined /> {title}</span>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} 
          onClick={handleSubmit}
          icon={<ThunderboltOutlined />}
        >
          生成
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">{getDescription()}</Text>
        
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholder()}
          autoSize={{ minRows: 4, maxRows: 8 }}
          style={{ marginTop: 16, marginBottom: 16 }}
        />
        
        <Text type="secondary" style={{ fontSize: '12px' }}>
          提示：您可以指定具体的风格、格式、关键词或内容要求。越具体的指令通常会得到越精确的结果。
        </Text>
      </Space>
    </Modal>
  );
};

export default CustomPromptModal; 