import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Upload, Card, Typography, Space } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { useTranslation } from 'react-i18next';
import { guildNameApi } from '../services/api';
import { getStaticUrl } from '../utils/config';
import { GuildNameResource } from '../types';

const { Title } = Typography;

const GuildSettings: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [guildName, setGuildName] = useState<string>('ROXGuild');
  const [backgroundImage, setBackgroundImage] = useState<string>(''); // Complete URL for display
  const [backgroundImagePath, setBackgroundImagePath] = useState<string>(''); // Relative path for database storage
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Load guild name
  useEffect(() => {
    loadGuildName();
  }, []);

  const loadGuildName = async () => {
    try {
      const response = await guildNameApi.get();
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setGuildName(data.guildName);
        // If background image is relative path, convert to complete URL
        const backgroundImageUrl = data.backgroundImage ? 
          (data.backgroundImage.startsWith('http') ? data.backgroundImage : getStaticUrl(data.backgroundImage)) : '';

        console.log('backgroundImageUrl', backgroundImageUrl);

        setBackgroundImage(backgroundImageUrl);
        // Store relative path for saving
        setBackgroundImagePath(data.backgroundImage || '');
        form.setFieldsValue({ guildName: data.guildName });
        
        // If there's a background image, set file list for display
        if (backgroundImageUrl) {
          setFileList([{
            uid: '-1',
            name: 'background.jpg',
            status: 'done',
            url: backgroundImageUrl
          }]);
        }
      } else {
        // If no data exists, create default
        await createDefaultGuildName();
      }
    } catch (error) {
      console.error('Failed to load guild name:', error);
      // If fetch fails, try to create default
      await createDefaultGuildName();
    }
  };

  const createDefaultGuildName = async () => {
    try {
      await guildNameApi.save({ guildName: 'ROXGuild' });
      setGuildName('ROXGuild');
      setBackgroundImage('');
      setBackgroundImagePath('');
      form.setFieldsValue({ guildName: 'ROXGuild' });
      setFileList([]);
    } catch (error) {
      console.error(t('settings.guild.createDefaultFailed'), error);
      form.setFieldsValue({ guildName: 'ROXGuild' });
    }
  };

  // File upload handling
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    // Check file type
    const isImage = (file as File).type.startsWith('image/');
    if (!isImage) {
      message.error(t('settings.guild.onlyImageAllowed'));
      onError?.(new Error('Invalid file type'));
      return;
    }
    
    // Check file size (limit to 5MB)
    const isLt5M = (file as File).size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('settings.guild.fileTooLarge'));
      onError?.(new Error('File too large'));
      return;
    }
    
    try {
      // Upload file to server
      const response = await guildNameApi.uploadBackground(file as File);
      if (response.data.success) {
        // Store relative path for database saving
        const relativePath = response.data.data.url;
        setBackgroundImagePath(relativePath);
        // Generate complete URL for display
        const imageUrl = getStaticUrl(relativePath);
        setBackgroundImage(imageUrl);
        onSuccess?.(response.data);
        message.success(t('settings.guild.uploadSuccess'));
      } else {
        throw new Error(response.data.error || t('settings.guild.uploadFailed'));
      }
    } catch (error) {
      console.error('Upload background image failed:', error);
      message.error(t('settings.guild.uploadFailed'));
      onError?.(error as Error);
    }
  };
  
  // Handle file list changes
  const handleFileChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
  };
  
  // Remove background image
  const handleRemoveBackground = () => {
    setBackgroundImage('');
    setBackgroundImagePath('');
    setFileList([]);
  };

  const handleSave = async (values: { guildName: string }) => {
    setLoading(true);
    try {
      const saveData = {
        guildName: values.guildName,
        backgroundImage: backgroundImagePath // Save relative path instead of complete URL
      };
      await guildNameApi.save(saveData);
      setGuildName(values.guildName);
      message.success(t('settings.guild.saveSuccess'));
      
      // Trigger custom event to notify App component update
      window.dispatchEvent(new CustomEvent('guildNameUpdate', { 
        detail: {
          guildName: values.guildName,
          backgroundImage: backgroundImage // Use complete URL for display in event
        }
      }));
    } catch (error) {
      console.error('Save guild settings failed:', error);
      message.error(t('settings.guild.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue({ guildName: guildName });
    setBackgroundImage('');
    setBackgroundImagePath('');
    setFileList([]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px' }}>
      <Title level={4} style={{ marginBottom: '24px' }}>{t('settings.guild.title')}</Title>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{ guildName: 'ROXGuild' }}
      >
        <Form.Item
          label={t('settings.guild.guildName')}
          name="guildName"
          rules={[
            { required: true, message: t('settings.guild.guildNameRequired') },
              { max: 50, message: t('settings.guild.guildNameMaxLength') },
              { min: 1, message: t('settings.guild.guildNameMinLength') }
          ]}
        >
          <Input 
            placeholder={t('settings.guild.guildNamePlaceholder')} 
            maxLength={50}
            showCount
          />
        </Form.Item>

        <Form.Item label={t('settings.guild.backgroundImage')}>
          <Card size="small" style={{ marginBottom: '16px' }}>
            <Upload
              customRequest={handleUpload}
              onChange={handleFileChange}
              fileList={fileList}
              listType="picture"
              maxCount={1}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />} disabled={fileList.length >= 1}>
                {t('settings.guild.uploadBackground')}
              </Button>
            </Upload>
            
            {backgroundImage && (
              <div style={{ marginTop: '16px' }}>
                <Typography.Text strong>{t('settings.guild.preview')}</Typography.Text>
                <div style={{
                  marginTop: '8px',
                  padding: '16px',
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url("${backgroundImage}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <Typography.Title level={4} style={{
                    margin: 0,
                    color: '#2c3e50',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                    fontWeight: 'bold'
                  }}>
                    {form.getFieldValue('guildName') || guildName}
                  </Typography.Title>
                </div>
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={handleRemoveBackground}
                  style={{ marginTop: '8px' }}
                  size="small"
                >
                  {t('settings.guild.removeBackground')}
                </Button>
              </div>
            )}
          </Card>
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
            >
              {t('settings.guild.save')}
            </Button>
            <Button onClick={handleReset}>
              {t('settings.guild.reset')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
        <Typography.Text type="secondary">
          <strong>{t('settings.guild.description')}</strong>{t('settings.guild.descriptionText')}
        </Typography.Text>
      </div>
    </div>
  );
};

export default GuildSettings;