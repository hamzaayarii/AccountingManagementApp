import React, { useState } from 'react';
import { Input } from 'reactstrap';
import { Image, Smile, Paperclip, Send } from 'react-feather';

const MessageInput = ({ sendMessage, handleTyping }) => {
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
  };

  const handleImageClick = () => {
    console.log('Image icon clicked');
    // Implement image upload modal or action here
  };

  const handleAttachmentClick = () => {
    console.log('Attachment icon clicked');
    // Implement file attachment functionality here
  };

  const handleEmojiClick = () => {
    console.log('Emoji icon clicked');
    // Toggle emoji picker
  };

  return (
    <form 
      onSubmit={handleSend} 
      className="d-flex border-top" 
      style={{ 
        backgroundColor: '#FFFFFF', 
        padding: '8px 12px',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 10
      }}
    >
      <div className="d-flex align-items-center mr-2">
        <button 
          type="button" 
          className="btn btn-link p-1" 
          style={{ border: 'none', color: '#6c757d' }}
          onClick={handleImageClick}
        >
          <Image size={18} />
        </button>
        <button 
          type="button" 
          className="btn btn-link p-1" 
          style={{ border: 'none', color: '#6c757d' }}
          onClick={handleAttachmentClick}
        >
          <Paperclip size={18} />
        </button>
        <button 
          type="button" 
          className="btn btn-link p-1" 
          style={{ border: 'none', color: '#6c757d' }}
          onClick={handleEmojiClick}
        >
          <Smile size={18} />
        </button>
      </div>
      
      <Input 
        value={message} 
        onChange={(e) => {
          setMessage(e.target.value);
          handleTyping();
        }}
        placeholder="write a message..." 
        style={{ 
          border: 'none', 
          borderRadius: '4px',
          backgroundColor: '#F1F1F1',
          padding: '8px 12px',
          fontSize: '14px'
        }}
      />
      
      <button 
        type="submit"
        className="btn p-1 ml-2" 
        style={{ 
          border: 'none',
          background: 'none',
          color: message.trim() ? '#0A66C2' : '#ccc'
        }}
        disabled={!message.trim()}
      >
        <Send size={18} />
      </button>
    </form>
  );
};

export default MessageInput;
