import React from 'react';
import { Form, Input, Button, Typography, Card, Row, Col } from 'antd';
import { SendOutlined, BulbOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const TopicInput: React.FC<TopicInputProps> = ({ value, onChange, onSubmit, loading }) => {
  return (
    <div>
      <Title level={4}>输入论文主题</Title>
      <Paragraph>
        请输入您想要生成论文的主题。描述越详细，生成的论文就越符合您的期望。
      </Paragraph>
      
      <Form layout="vertical">
        <Form.Item
          required
          label="论文主题"
          rules={[{ required: true, message: '请输入论文主题' }]}
        >
          <TextArea 
            rows={6} 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="例如：人工智能在医疗领域的应用与伦理挑战"
            style={{ fontSize: '16px', resize: 'none' }}
          />
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={24}>
            <Card 
              title={<span><BulbOutlined /> 主题建议</span>}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[8, 8]}>
                {[
                  '人工智能在教育领域的应用与挑战',
                  '区块链技术对金融行业的影响',
                  '气候变化与可持续发展战略研究',
                  '数字化转型对企业管理的影响'
                ].map((suggestion, index) => (
                  <Col span={12} key={index}>
                    <Button 
                      block 
                      style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                      onClick={() => onChange(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
        
        <Form.Item>
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={onSubmit}
            loading={loading}
            disabled={!value.trim()}
            size="large"
            block
          >
            生成论文标题
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TopicInput; 