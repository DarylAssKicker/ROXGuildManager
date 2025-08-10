import React, { useState, useRef, useCallback } from 'react';
import { GuildMember } from '../types';
import { uploadScreenshot, saveGuildMembers, guildMembersApi } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import './ImageRecognition.css';

interface ImageRecognitionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (members: GuildMember[]) => void;
}

const ImageRecognition: React.FC<ImageRecognitionProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedMembers, setRecognizedMembers] = useState<GuildMember[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError('');
        setSuccess('');
      } else {
        setError('Please select an image file');
      }
    }
  };

  // Handle clipboard paste
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
            setSuccess('');
            break;
          }
        }
      }
    }
  }, []);

  // Listen for clipboard events
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, handlePaste]);

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError('');
        setSuccess('');
      } else {
        setError('Please select an image file');
      }
    }
  };

  // Process guild member data - copied from ScreenshotUpload logic
  const processGuildMemberData = (ocrData: any): GuildMember[] => {
    const members: GuildMember[] = [];
    
    if (!ocrData) {
      return members;
    }

    // Handle different data structures
    let rawText = '';
    
    // Check if it's the new OCR result format
    if (ocrData.ocrResult && ocrData.ocrResult.rawText) {
      rawText = ocrData.ocrResult.rawText;
    } else if (ocrData.rawText) {
      rawText = ocrData.rawText;
    } else {
      return members;
    }
    
    // Use improved parsing method: parse line by line from raw text
    if (rawText) {
      const lines = rawText.split('\n');
      let memberIndex = 1;
      
      lines.forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          // Skip header lines and empty lines
          if (trimmedLine.includes('oO') || trimmedLine.includes('©') || trimmedLine.length < 10) {
            return;
          }
          
          // Improved parsing logic
          const member = parseGuildMemberLine(trimmedLine, memberIndex);
          if (member) {
            members.push(member);
            memberIndex++;
          }
        }
      });
    }

    return members;
  };

  // Parse single line guild member data
  const parseGuildMemberLine = (line: string, index: number): GuildMember | null => {
    // ROX guild member line format is usually:
    // Name [Gender Symbol] Level Class Guild ID Weekly Contribution Total Contribution Online Status
    
    // Common job class list (for identifying job position)
    const jobClasses = [
      'Whitesmith', 'High Priest', 'Lord Knight', 'Paladin', 'Assassin Cross',
      'High Wizard', 'Champion', 'Sniper', 'Clown', 'Gypsy', 'Stalker',
      'Creator', 'Professor', 'Priest', 'Knight', 'Wizard', 'Archer',
      'Assassin', 'Merchant', 'Monk', 'Hunter', 'Blacksmith', 'Sage',
      'Rogue', 'Alchemist', 'Bard', 'Dancer'
    ];
    
    // Split line content
    const parts = line.split(/\s+/);
    if (parts.length < 5) return null;
    
    // Find job keyword position
    let jobIndex = -1;
    let jobClass = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Handle job names with prefix symbols (e.g., 'Whitesmith, 'Champion)
      // Support various types of quotes: ASCII single quote(39), left single quote(8216), right single quote(8217), backtick(96)
      const cleanPart = part.replace(/^[\u2018\u2019\u0027\u0060\u201C\u201D]/g, '');
      
      // Check single word
      const singleJob = jobClasses.find(job => 
        job.toLowerCase() === cleanPart.toLowerCase()
      );
      if (singleJob) {
        jobIndex = i;
        jobClass = singleJob;
        break;
      }
      
      // Check compound words (e.g., "High Priest", "Lord Knight", "Assassin Cross")
      if (i < parts.length - 1) {
        const nextPart = parts[i + 1];
        const combinedPart = `${cleanPart} ${nextPart}`;
        const combinedJob = jobClasses.find(job => 
          job.toLowerCase() === combinedPart.toLowerCase()
        );
        if (combinedJob) {
          jobIndex = i;
          jobClass = combinedJob;
          break;
        }
      }
      
      // Check three-word combinations (if needed)
      if (i < parts.length - 2) {
        const nextPart1 = parts[i + 1];
        const nextPart2 = parts[i + 2];
        const tripleparts = `${cleanPart} ${nextPart1} ${nextPart2}`;
        const tripleJob = jobClasses.find(job => 
          job.toLowerCase() === tripleparts.toLowerCase()
        );
        if (tripleJob) {
          jobIndex = i;
          jobClass = tripleJob;
          break;
        }
      }
    }
    
    if (jobIndex === -1) return null;
    
    // Parse fixed position fields from back to front
    const onlineStatus = parts[parts.length - 1];
    let totalContrib = 0;
    let sevenDayContrib = 0;
    let guildPosition = '';
    let level = 0;
    
    // Parse numeric fields
    const numberParts = [];
    for (let i = parts.length - 2; i > jobIndex; i--) {
      const num = parseInt(parts[i]);
      if (!isNaN(num)) {
        numberParts.unshift(num);
      } else {
        // Stop when encountering non-numeric values
        break;
      }
    }
    
    // Assign fields based on number count
    if (numberParts.length >= 4) {
      // Format: Level Guild ID Weekly Contribution Total Contribution
      level = numberParts[0];
      guildPosition = numberParts[1].toString();
      sevenDayContrib = numberParts[2];
      totalContrib = numberParts[3];
    } else if (numberParts.length >= 3) {
      // Format: Level Weekly Contribution Total Contribution
      level = numberParts[0];
      sevenDayContrib = numberParts[1];
      totalContrib = numberParts[2];
      guildPosition = '187'; // Default guild ID
    }
    
    // Find level position (first number after job class)
    let levelIndex = jobIndex + 1;
    if (jobClass.includes(' ')) {
      levelIndex = jobIndex + 2; // If job class is two words, level is after the second word
    }
    if (jobClass.split(' ').length > 2) {
      levelIndex = jobIndex + 3; // If job class is three words
    }
    
    // If level not found yet, search for first number after job class
    if (level === 0) {
      for (let i = levelIndex; i < parts.length; i++) {
        const num = parseInt(parts[i]);
        if (!isNaN(num)) {
          level = num;
          break;
        }
      }
    }
    
    // Extract player name (from start to before job class)
    const nameParts = parts.slice(0, jobIndex);
    
    // Filter special symbols and numbers from name
    const filteredNameParts = nameParts.filter(part => {
      // Keep parts containing letters
      if (!/[a-zA-Z]/.test(part)) return false;
      // Filter pure numbers
      if (/^\d+$/.test(part)) return false;
      // Filter pure symbols
      if (/^[+\-=*#:;,.\[\]{}()!@$%^&*_|\\/<>?~`"']+$/.test(part)) return false;
      return true;
    });
    
    if (filteredNameParts.length === 0) return null;
    
    const playerName = filteredNameParts.join(' ').trim();
    
    // Detect gender (based on special marks in name)
    let gender: 'Male' | 'Female' = 'Male'; // Default
    const hasFemaleMark = line.includes('Fa') || line.includes('♀') || line.includes('F');
    if (hasFemaleMark) {
      gender = 'Female';
    }
    
    // Handle online status
    let onlineTime = 'Online';
    if (onlineStatus) {
      if (onlineStatus.includes('ago') || onlineStatus.includes('Shouris') || onlineStatus.includes('minute') || onlineStatus.includes('hour')) {
        onlineTime = 'Offline';
      } else if (onlineStatus === 'Cnline' || onlineStatus === 'Gnline') {
        onlineTime = 'Online';
      } else {
        onlineTime = onlineStatus;
      }
    }
    
    return {
      id: index,
      name: playerName,
      level: level || 1,
      class: jobClass,
    };
  };

  // Start recognition
  const handleRecognize = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('screenshot', selectedFile);

      const response = await uploadScreenshot(formData);
      
      if (response.success && response.data) {
        // Use ScreenshotUpload's data processing logic
        const members = processGuildMemberData(response.data);
        setRecognizedMembers(members);
        setSuccess(`Successfully recognized ${members.length} guild members`);
      } else {
        setError(response.error || 'Recognition failed');
      }
    } catch (err) {
      setError('An error occurred during recognition');
      console.error('Recognition error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to database
  const handleSave = async () => {
    if (recognizedMembers.length === 0) {
      setError('No member data to save');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Use batch update interface, which automatically uses current logged-in user's identity
      const response = await guildMembersApi.batchUpdate(recognizedMembers);
      
      if (response.data.success) {
        setSuccess('Guild member data saved successfully!');
        onSuccess(recognizedMembers);
        // Delay closing window
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Save failed');
      }
    } catch (err) {
      setError('An error occurred during saving');
      console.error('Save error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear data
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setRecognizedMembers([]);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="image-recognition-overlay">
      <div className="image-recognition-modal">
        <div className="image-recognition-header">
          <h2>Image Recognition - Guild Members</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="image-recognition-content">
          {/* Image upload area */}
          <div className="upload-section">
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📷</div>
                  <p>Click to select image or drag image here</p>
                  <p className="upload-hint">Support Ctrl+V to paste clipboard image</p>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Action buttons */}
          <div className="action-buttons">
            <button 
              className="recognize-button"
              onClick={handleRecognize}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? 'Recognizing...' : 'Start Recognition'}
            </button>
            
            <button 
              className="clear-button"
              onClick={handleClear}
              disabled={isProcessing}
            >
              Clear
            </button>
          </div>

          {/* Error and success messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Recognition results */}
          {recognizedMembers.length > 0 && (
            <div className="recognition-results">
              <h3>Recognition Results ({recognizedMembers.length} {t('template.units.members')})</h3>
              <div className="members-preview">
                {recognizedMembers.slice(0, 5).map((member, index) => (
                  <div key={index} className="member-preview-item">
                    <span className="member-name">{member.name}</span>
                    <span className="member-level">Lv.{member.level}</span>
                    {member.class && <span className="member-class">{member.class}</span>}
                  </div>
                ))}
                {recognizedMembers.length > 5 && (
                  <div className="more-members">
                    {recognizedMembers.length - 5} more {t('template.units.members')}...
                  </div>
                )}
              </div>
              
              <button 
                className="save-button"
                onClick={handleSave}
                disabled={isProcessing}
              >
                {isProcessing ? 'Saving...' : 'Save to Database'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageRecognition;