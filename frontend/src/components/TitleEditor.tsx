import React from 'react';
import { Input, Button, Typography, Card, List, Tag, Spin } from 'antd';
import { EditOutlined, ThunderboltOutlined, CheckOutlined, ReloadOutlined, FormOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface TitleEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  titleSuggestions: string[];
  onRefreshSuggestions: () => void;
  suggestionsLoading: boolean;
  onCustomPrompt: () => void;
}

const TitleEditor: React.FC<TitleEditorProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  titleSuggestions, 
  onRefreshSuggestions,
  suggestionsLoading,
  onCustomPrompt
}) => {
  return (
    <div>
      <Title level={4}>确认或修改论文标题</Title>
      <Paragraph>
        我们基于您的主题生成了以下标题建议。您可以直接使用，或进行修改后继续。
      </Paragraph>
      
      <Card
        title={<span><ThunderboltOutlined /> 生成的标题</span>}
        extra={<Tag color="green"><CheckOutlined /> AI 生成</Tag>}
        bordered={false}
        style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          prefix={<EditOutlined />}
          size="large"
          style={{ marginBottom: 16 }}
        />
        
        <Button 
          type="dashed" 
          icon={<FormOutlined />} 
          onClick={onCustomPrompt}
          style={{ marginBottom: 16 }}
        >
          使用自定义提示词重新生成
        </Button>
      </Card>
      
      <Card 
        title="其他标题建议" 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="text" 
            icon={<ReloadOutlined spin={suggestionsLoading} />} 
            onClick={onRefreshSuggestions}
            disabled={suggestionsLoading}
          >
            刷新建议
          </Button>
        }
      >
        {suggestionsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="正在生成标题建议..." />
          </div>
        ) : titleSuggestions.length > 0 ? (
          <List
            size="small"
            dataSource={titleSuggestions}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    onClick={() => onChange(item)}
                    icon={<CheckOutlined />}
                  >
                    使用此标题
                  </Button>
                ]}
              >
                {item}
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            暂无标题建议，点击刷新按钮生成
          </div>
        )}
      </Card>
      
      <Button
        type="primary"
        onClick={onSubmit}
        loading={loading}
        disabled={!value.trim()}
        size="large"
        block
      >
        确认标题并生成大纲
      </Button>
    </div>
  );
};

export default TitleEditor; 