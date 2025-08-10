import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import ClassSettings from './ClassSettings';
import LanguageTest from './LanguageTest';
import GuildSettings from './GuildSettings';

const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('guild');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card 
        title={t('navigation.settings')} 
        style={{ flex: 1, overflow: 'hidden' }}
        bodyStyle={{ height: 'calc(100% - 57px)', padding: '0' }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          tabPosition="left"
          style={{ height: '100%' }}
        >
          <TabPane 
            tab={t('settings.tabs.guild')} 
            key="guild"
            style={{ height: '100%', padding: '0 24px' }}
          >
            <GuildSettings />
          </TabPane>
          <TabPane 
            tab={t('settings.tabs.classes')} 
            key="classes"
            style={{ height: '100%', padding: '0 24px' }}
          >
            <ClassSettings />
          </TabPane>
          <TabPane 
            tab={t('settings.tabs.language')} 
            key="language"
            style={{ height: '100%', padding: '0 24px' }}
          >
            <LanguageTest />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;