import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Dropdown } from 'antd';
import {
  TeamOutlined,
  CameraOutlined,
  SettingOutlined,
  GlobalOutlined,
  TrophyOutlined,
  CrownOutlined,
  FireOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  UserOutlined,
  UsergroupDeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import GuildMemberList from './components/GuildMemberList';
import ScreenshotUpload from './components/ScreenshotUpload';
import AAManager from './components/AAManager';
import GVGManager from './components/GVGManager';
import KVMManager from './components/KVMManager';
import DataAnalysis from './components/DataAnalysis';
import Settings from './components/Settings';
import GroupPartyManager from './components/GroupParty/GroupPartyManager';
import SubAccountManager from './components/SubAccountManager';
import AppInfo from './components/AppInfo';
import ProtectedRoute from './components/ProtectedRoute';
import { useTranslation } from './hooks/useTranslation';
import { useAuth } from './contexts/AuthContext';
import { guildNameApi } from './services/api';
import './App.css';
import { getStaticUrl } from './utils/config';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  // Read last selected menu from localStorage, default to 'members'
  const [selectedMenu, setSelectedMenu] = useState(() => {
    return localStorage.getItem('selectedMenu') || 'members';
  });
  
  // Guild name state
  const [guildName, setGuildName] = useState<string>('ROXGuild');
  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  const { t, currentLanguage, supportedLanguages, changeLanguage } = useTranslation();
  const { user, logout } = useAuth();

  // Save to localStorage when menu selection changes
  useEffect(() => {
    localStorage.setItem('selectedMenu', selectedMenu);
  }, [selectedMenu]);
  
  // Load guild name
  useEffect(() => {
    // Only load guild name when user is logged in
    if (user) {
      loadGuildName();
    }
    
    // Listen for guild name update events
    const handleGuildNameUpdate = (event: CustomEvent) => {
      setGuildName(event.detail.guildName || event.detail);
      if (event.detail.backgroundImage !== undefined) {
        console.log('Event backgroundImage update:', event.detail.backgroundImage);
        // GuildSettings event passes complete URL, no need to process again
        setBackgroundImage(event.detail.backgroundImage || '');
        console.log('Event backgroundImage set to:', event.detail.backgroundImage);
      }
    };
    
    window.addEventListener('guildNameUpdate', handleGuildNameUpdate as EventListener);
    
    return () => {
      window.removeEventListener('guildNameUpdate', handleGuildNameUpdate as EventListener);
    };
  }, [user]);
  
  const loadGuildName = async () => {
    try {
      const response = await guildNameApi.get();
      console.log('Load guild name response:', response.data);
      if (response.data && response.data.success && response.data.data) {
        console.log('Load guild name:response.data.data.guildName', response.data.data.guildName);
        setGuildName(response.data.data.guildName);

        console.log('backgroundImage:response.data.data.backgroundImage', response.data.data.backgroundImage);
        const bgImage = response.data.data.backgroundImage;
        if (bgImage) {
          const processedUrl = getStaticUrl(bgImage);
          console.log('backgroundImage:getStaticUrl result', processedUrl);
          setBackgroundImage(processedUrl);
        } else {
          console.log('backgroundImage: No background image provided');
          setBackgroundImage('');
        }
      } else {
        // If no guild name, set default value
        setGuildName('ROXGuild');
        setBackgroundImage('');
      }
    } catch (error) {
      console.error('Failed to load guild name:', error);
      // If fetch fails, set default value
      setGuildName('ROXGuild');
      setBackgroundImage('');
    }
  };
  
  // Menu items configuration
  const menuItems = [
    {
      key: 'members',
      icon: <TeamOutlined />,
      label: t('navigation.guildMembers'),
    },
    {
      key: 'groupparty',
      icon: <UsergroupAddOutlined />,
      label: t('navigation.groupParty'),
    },
    {
      key: 'kvm',
      icon: <TrophyOutlined />,
      label: t('navigation.kvm'),
    },
    {
      key: 'aa',
      icon: <CrownOutlined />,
      label: t('navigation.aa'),
    },
    {
      key: 'gvg',
      icon: <FireOutlined />,
      label: t('navigation.gvg'),
    },
    {
      key: 'analysis',
      icon: <BarChartOutlined />,
      label: t('navigation.dataAnalysis'),
    },
    // Only show screenshot upload for non-viewer users
    ...(user?.role !== 'viewer' ? [{
      key: 'screenshot',
      icon: <CameraOutlined />,
      label: t('navigation.screenshotUpload'),
    }] : []),
    // Only show sub-accounts menu for owner/admin users
    ...(user?.role === 'owner' || user?.role === 'admin' ? [{
      key: 'subaccounts',
      icon: <UsergroupDeleteOutlined />,
      label: t('subAccount.title'),
    }] : []),
    // Only show settings for non-viewer users
    ...(user?.role !== 'viewer' ? [{
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('navigation.settings'),
    }] : []),
    {
      key: 'appinfo',
      icon: <InfoCircleOutlined />,
      label: t('appInfo.title'),
    },
  ];

  // Language switching menu
  const languageMenuItems = supportedLanguages.map(lang => ({
    key: lang.code,
    label: (
      <Space key={lang.code}>
        <span>{lang.nativeName}</span>
        <span style={{ color: '#999', fontSize: '12px' }}>({lang.name})</span>
      </Space>
    ),
    onClick: () => changeLanguage(lang.code),
  }));

  // User menu
  const userMenuItems = [
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          <span>{t('auth.login.logout')}</span>
        </Space>
      ),
      onClick: logout,
    },
  ];

  // Render main content
  const renderContent = () => {
    switch (selectedMenu) {
      case 'members':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              marginBottom: 16, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0
            }}>
              <Title level={3} style={{ margin: 0 }}>{t('guildMember.title')}</Title>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <GuildMemberList />
            </div>
          </div>
        );
      case 'kvm':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <KVMManager />
          </div>
        );
      case 'aa':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AAManager />
          </div>
        );
      case 'gvg':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <GVGManager />
          </div>
        );
      case 'analysis':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataAnalysis />
          </div>
        );
      case 'screenshot':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Title level={3} style={{ marginBottom: 16, flexShrink: 0 }}>{t('screenshot.title')}</Title>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ScreenshotUpload />
            </div>
          </div>
        );
      case 'groupparty':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <GroupPartyManager />
          </div>
        );
      case 'subaccounts':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SubAccountManager />
          </div>
        );
      case 'settings':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Settings />
          </div>
        );
      case 'appinfo':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AppInfo />
          </div>
        );
      default:
        return <div>{t('common.loading')}</div>;
    }
  };

  // Debug: Log background image state when rendering
  console.log('Rendering with backgroundImage:', backgroundImage);
  
  // Debug: Log the complete CSS background value
  // Temporarily simplify CSS, remove linear gradient test
  const backgroundCSS = backgroundImage ? `url("${backgroundImage}")` : '#fff';
  console.log('CSS background value:', backgroundCSS);

  return (
    <ProtectedRoute>
      <Layout style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ 
          position: 'relative',
          padding: 0,
          height: 'auto',
          minHeight: '80px',
          overflow: 'hidden'
        }}>
          {/* Background layer */}
          {backgroundImage && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 30,
              right: 0,
              bottom: 0,
              backgroundImage: `url("${backgroundImage}")`,
              backgroundSize: 'auto 100%',
              backgroundPosition: 'left center',
              backgroundRepeat: 'no-repeat',
              opacity: 1,
              zIndex: 1
            }} />
          )}
          {/* Content layer */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            background: backgroundImage ? 'transparent' : '#fff',
            height: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
          <Space>
            {!backgroundImage && (
              <Title level={4} style={{ 
                margin: 0, 
                color: '#1890ff',
                fontWeight: 'bold'
              }}>
                {guildName}
              </Title>
            )}
          </Space>
          <Space>
            <Dropdown 
              menu={{ items: languageMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button 
                type="text" 
                icon={<GlobalOutlined />}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {currentLanguage.nativeName}
              </Button>
            </Dropdown>
            <Dropdown 
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button 
                type="text" 
                icon={<UserOutlined />}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {user?.username}
              </Button>
            </Dropdown>
            <span style={{ color: '#666' }}>v1.3.0</span>
          </Space>
          </div>
        </Header>
        
        <Layout style={{ flex: 1 }}>
          <Sider 
            width={200} 
            style={{ 
              background: '#fff',
              borderRight: '1px solid #f0f0f0'
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              style={{ 
                height: '100%', 
                borderRight: 0,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff'
              }}
              theme="dark"
              items={menuItems}
              onClick={({ key }) => setSelectedMenu(key)}
              className="custom-menu"
            />
          </Sider>
          
          <Layout style={{ padding: '16px', background: '#f5f5f5' }}>
            <Content style={{ 
              background: '#fff', 
              padding: 16, 
              margin: 0, 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {renderContent()}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
};

export default App;