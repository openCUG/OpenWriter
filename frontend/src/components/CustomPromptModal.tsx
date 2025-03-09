import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Typography, Space, Radio, RadioChangeEvent, Alert } from 'antd';
import { EditOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface CustomPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, isNewGeneration: boolean) => void;
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
  const [generationType, setGenerationType] = useState<'modify' | 'new'>('modify');

  // 当defaultPrompt变化时更新prompt状态
  useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  // 当模态框打开时重置生成类型
  useEffect(() => {
    if (visible) {
      setGenerationType('modify');
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(prompt, generationType === 'new');
  };

  const handleGenerationTypeChange = (e: RadioChangeEvent) => {
    setGenerationType(e.target.value);
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

  const getFormatTip = () => {
    if (type === 'title') {
      return '系统会自动确保生成的标题符合学术规范：专业准确、学术性强、长度适中';
    } else {
      return '系统会自动确保大纲符合学术论文结构：包含引言、文献综述、研究方法、结果分析、结论等主要部分，每个部分有详细子目录，并保持格式一致。';
    }
  };

  return (
    <Modal
      title={<span><EditOutlined /> {title}</span>}
      open={visible}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button key="back" onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleSubmit}
            icon={<ThunderboltOutlined />}
          >
            生成
          </Button>
        </div>
      }
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">{getDescription()}</Text>
        
        <Alert
          message="格式提示"
          description={getFormatTip()}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: 8, marginBottom: 8 }}
        />
        
        <Radio.Group 
          value={generationType} 
          onChange={handleGenerationTypeChange}
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          <Radio value="modify">在已生成内容基础上修改</Radio>
          <Radio value="new">全新生成</Radio>
        </Radio.Group>
        
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholder()}
          autoSize={{ minRows: 4, maxRows: 8 }}
          style={{ marginTop: 8, marginBottom: 16 }}
        />
        
        <Text type="secondary" style={{ fontSize: '12px' }}>
          提示：您可以指定具体的风格、格式、关键词或内容要求。越具体的指令通常会得到越精确的结果。
        </Text>
      </Space>
    </Modal>
  );
};

export default CustomPromptModal; 