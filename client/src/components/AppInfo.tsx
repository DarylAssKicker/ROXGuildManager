import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { UserOutlined, CloudOutlined } from '@ant-design/icons';
import { useTranslation } from '../hooks/useTranslation';

const { Title, Text } = Typography;

const AppInfo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3} style={{ marginBottom: 24 }}>
          {t('appInfo.title')}
        </Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <UserOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '16px' }}>
                {t('appInfo.developer')}
              </Text>
            </Space>
            <Text style={{ fontSize: '18px', marginLeft: 24 }}>
              Daryl
            </Text>
          </div>
          
          <Divider />
          
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <CloudOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
              <Text strong style={{ fontSize: '16px' }}>
                {t('appInfo.awsDeployment')}
              </Text>
            </Space>
            <Text style={{ fontSize: '18px', marginLeft: 24 }}>
              Fade
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default AppInfo;