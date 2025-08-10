import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin, Select } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { LoginForm as LoginFormType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

const { Title } = Typography;

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { login } = useAuth();
  const { t, currentLanguage, supportedLanguages, changeLanguage } = useTranslation();

  const handleLogin = async (values: LoginFormType) => {
    setLoading(true);
    try {
      await login(values);
      // After successful login, AuthContext will automatically update state and trigger UI re-render
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      // AuthContext's login method has already handled error message display
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          position: 'relative'
        }}
      >
        {/* Language Switcher */}
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <Select
            value={currentLanguage.code}
            onChange={changeLanguage}
            size="small"
            style={{ minWidth: 80 }}
            suffixIcon={<GlobalOutlined />}
            options={supportedLanguages.map(lang => ({
              value: lang.code,
              label: lang.nativeName
            }))}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            {t('app.title')}
          </Title>
          <Typography.Text type="secondary">
            {t('auth.login.title')}
          </Typography.Text>
        </div>

        <Spin spinning={loading}>
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: t('auth.login.usernameRequired') },
                { min: 3, message: t('auth.login.usernameMinLength') }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t('auth.login.username')}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: t('auth.login.passwordRequired') },
                { min: 6, message: t('auth.login.passwordMinLength') }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.login.password')}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                style={{ width: '100%', height: '44px' }}
                loading={loading}
              >
{t('auth.login.loginButton')}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default Login;