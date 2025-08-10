import React from 'react';
import { Card, Space, Typography, Tag } from 'antd';
import { useTranslation } from '../hooks/useTranslation';

const { Title, Text } = Typography;

const LanguageTest: React.FC = () => {
  const { t, currentLanguage, supportedLanguages } = useTranslation();

  return (
    <div style={{ padding: 24 }}>
      <Card title="i18n Test Page">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Current Language Information</Title>
            <Space direction="vertical">
              <Text><strong>Code:</strong> {currentLanguage.code}</Text>
              <Text><strong>Name:</strong> {currentLanguage.name}</Text>
              <Text><strong>Native Name:</strong> {currentLanguage.nativeName}</Text>
            </Space>
          </div>

          <div>
            <Title level={4}>Supported Languages</Title>
            <Space wrap>
              {supportedLanguages.map(lang => (
                <Tag key={lang.code} color={lang.code === currentLanguage.code ? 'blue' : 'default'}>
                  {lang.nativeName} ({lang.code})
                </Tag>
              ))}
            </Space>
          </div>

          <div>
            <Title level={4}>Translation Tests</Title>
            <Space direction="vertical">
              <Text><strong>App Title:</strong> {t('app.title')}</Text>
              <Text><strong>Guild Members:</strong> {t('navigation.guildMembers')}</Text>
              <Text><strong>Screenshot Upload:</strong> {t('navigation.screenshotUpload')}</Text>
              <Text><strong>Add Member:</strong> {t('guildMember.addMember')}</Text>
              <Text><strong>Name:</strong> {t('common.name')}</Text>
              <Text><strong>Level:</strong> {t('common.level')}</Text>
              <Text><strong>Class:</strong> {t('common.class')}</Text>
              <Text><strong>Success:</strong> {t('common.success')}</Text>
              <Text><strong>Error:</strong> {t('common.error')}</Text>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LanguageTest;