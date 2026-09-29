import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Image as ImageIcon,
  ShoppingCart,
  ExternalLink,
  ChevronDown,
  Trash2,
  Package,
  ShieldCheck,
  Star,
  CheckCircle,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCurrency } from '../../context/CurrencyContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface CommerceAssistantProps {
  onSelectProduct: (product: any) => void;
  onNavigate: (view: string) => void;
  onOpenAuth: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredData?: {
    products?: any[];
    citations?: string[];
    actions?: Array<{
      type: string;
      title: string;
      payload?: any;
    }>;
  };
  feedback?: 'positive' | 'negative' | null;
  feedbackComment?: string;
  timestamp: string;
}

export function CommerceAssistant({ onSelectProduct, onNavigate, onOpenAuth }: CommerceAssistantProps) {
  const { user, token, guestSessionId } = useAuth();
  const { currency, format } = useCurrency();
  const { addToCart } = useCart();
  const { success, error, info } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Voice Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text to Speech State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Image Upload State
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [feedbackPromptId, setFeedbackPromptId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Load conversation ID from localStorage on mount
  useEffect(() => {
    const savedConv = localStorage.getItem('ce_ai_conversation_id');
    if (savedConv) {
      setConversationId(savedConv);
      loadHistory(savedConv);
    } else {
      // Welcome message
      initWelcomeMessage();
    }
  }, []);

  const initWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content:
          '👋 Hello! I am your **Commerce Assistant**.\n\nI can help you:\n• Find the best products & compare specifications\n• Check real-time stock & prices\n• Track your orders & delivery timeline\n• Answer return, refund & shipping questions\n• Assist with your cart & active discount coupons\n\nHow can I help you shop today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const loadHistory = async (convId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/ai/conversations/${convId}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              structuredData: m.structuredData,
              feedback: m.feedback,
              feedbackComment: m.feedbackComment,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }))
          );
          return;
        }
      }
    } catch {}
    initWelcomeMessage();
  };

  // Clear Chat Session
  const handleClearChat = () => {
    const newConvId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setConversationId(newConvId);
    localStorage.setItem('ce_ai_conversation_id', newConvId);
    initWelcomeMessage();
    info('Conversation reset.');
  };

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      error('Image size must be under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64Data = result.split(',')[1];
      setAttachedImage({
        base64: base64Data,
        mimeType: file.type,
        preview: result,
      });
      info('Image attached for visual product search.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Input (SpeechRecognition)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      error('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        info('Listening... speak now.');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputValue(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      error('Failed to start microphone.');
    }
  };

  // Text-To-Speech (SpeechSynthesis)
  const toggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner speech
    const cleanText = text.replace(/[*#_`•-]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Submit Feedback
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );

    if (feedback === 'negative') {
      setFeedbackPromptId(messageId);
    } else {
      success('Thank you for your feedback!');
      try {
        await fetch('/api/ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, feedback: 'positive' }),
        });
      } catch {}
    }
  };

  const submitNegativeComment = async (messageId: string) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          feedback: 'negative',
          comment: feedbackComment,
        }),
      });
      success('Feedback recorded. Thank you for helping us improve!');
      setFeedbackPromptId(null);
      setFeedbackComment('');
    } catch {
      error('Failed to submit feedback.');
    }
  };

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!query && !attachedImage) return;

    const userMsgText = query || (attachedImage ? 'Find products matching this uploaded image.' : '');
    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const imageToSend = attachedImage;
    setAttachedImage(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-guest-session': guestSessionId || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsgText,
          conversationId,
          imageBase64: imageToSend?.base64,
          imageMimeType: imageToSend?.mimeType,
          currency,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.conversationId) {
          setConversationId(data.conversationId);
          localStorage.setItem('ce_ai_conversation_id', data.conversationId);
        }

        const assistantMsg: ChatMessage = {
          id: data.messageId || `ast-${Date.now()}`,
          role: 'assistant',
          content: data.message || "I've retrieved the requested marketplace information.",
          structuredData: {
            products: data.products || [],
            citations: data.citations || [],
            actions: data.actions || [],
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: data.error || 'Sorry, I encountered an issue retrieving that. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I am temporarily unable to connect to the assistant server. Please check your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Add To Cart from Chat
  const handleAddToCartFromChat = async (product: any) => {
    const successAdd = await addToCart(product.id, null, 1);
    if (successAdd) {
      success(`Added "${product.name}" to your cart!`);
    }
  };

  // Action Click Handler
  const handleActionClick = async (action: any) => {
    switch (action.type) {
      case 'VIEW_PRODUCT':
        if (action.payload?.productId) {
          onSelectProduct({ id: action.payload.productId, slug: action.payload.productId });
        }
        break;
      case 'CONFIRM_ADD_TO_CART':
        if (action.payload?.productId) {
          try {
            const successAdd = await addToCart(action.payload.productId, null, 1);
            if (successAdd) {
              success(`Added item to your cart!`);
            }
          } catch (err) {
            console.error('Failed to add to cart from action:', err);
          }
        }
        break;
      case 'COMPARE_PRODUCTS':
        onNavigate('compare');
        break;
      case 'VIEW_CART':
        onNavigate('cart');
        break;
      case 'VIEW_ORDER':
        if (!user) {
          onOpenAuth();
        } else {
          onNavigate('account');
        }
        break;
      case 'EXPLORE_CATALOG':
        onNavigate('catalog');
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer"
          aria-label="Open Commerce Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-indigo-900"></span>
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-extrabold tracking-wide block leading-tight">Commerce AI</span>
            <span className="text-[10px] text-indigo-200 font-medium leading-tight">Ask & Shop</span>
          </div>
        </button>
      )}

      {/* Modern Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10 md:inset-16 w-auto h-auto'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[440px] h-[82vh] max-h-[640px]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">Commerce Assistant</h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE DATA
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  {user ? `Shopping as ${user.name}` : 'Multi-vendor shopping copilot'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title="Clear Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors hidden sm:block"
                title={isExpanded ? 'Restore size' : 'Maximize'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setSpeakingMsgId(null);
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Message Content with Markdown Formatting */}
                  <div className="leading-relaxed whitespace-pre-wrap font-normal">
                    {msg.content}
                  </div>

                  {/* Product Cards Grid inside Chat */}
                  {msg.structuredData?.products && msg.structuredData.products.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Matching Products from Database ({msg.structuredData.products.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.structuredData.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col justify-between transition-colors"
                          >
                            <div className="flex gap-2 items-start">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-12 h-12 object-cover rounded-lg shrink-0 bg-white border border-slate-200"
                              />
                              <div className="min-w-0 flex-1">
                                <h4
                                  onClick={() => onSelectProduct({ id: prod.id, slug: prod.slug })}
                                  className="font-bold text-[11px] text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                  <span>{prod.seller}</span>
                                  <span>•</span>
                                  <span className="flex items-center text-amber-500 font-semibold">
                                    <Star className="w-2.5 h-2.5 fill-current mr-0.5" />
                                    {prod.rating}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {format(prod.discountPrice || prod.price)}
                                  </span>
                                  {prod.discountPrice && (
                                    <span className="line-through text-slate-400 text-[10px]">
                                      {format(prod.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                              <button
                                onClick={() => onSelectProduct({ id: prod.id, slug: prod.slug })}
                                className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-200"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleAddToCartFromChat(prod)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                              >
                                <ShoppingCart className="w-2.5 h-2.5" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Pills */}
                  {msg.structuredData?.actions && msg.structuredData.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.structuredData.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>{act.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Citations & Sources */}
                  {msg.structuredData?.citations && msg.structuredData.citations.length > 0 && (
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                      <span className="font-semibold text-slate-500">Verified by:</span>
                      {msg.structuredData.citations.map((cite, i) => (
                        <span key={i} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">
                          {cite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Meta & Interaction Toolbar */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>

                  {msg.role === 'assistant' && msg.id !== 'welcome-msg' && (
                    <>
                      <span>•</span>
                      {/* TTS Read Aloud */}
                      <button
                        onClick={() => toggleSpeak(msg.id, msg.content)}
                        className="hover:text-indigo-600 flex items-center gap-0.5"
                        title={speakingMsgId === msg.id ? 'Stop audio' : 'Read aloud'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-500" />
                            <span className="text-rose-600 font-semibold">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>

                      <span>•</span>
                      {/* Feedback Thumb */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFeedback(msg.id, 'positive')}
                          className={`hover:text-emerald-600 ${msg.feedback === 'positive' ? 'text-emerald-600 font-bold' : ''}`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'negative')}
                          className={`hover:text-rose-600 ${msg.feedback === 'negative' ? 'text-rose-600 font-bold' : ''}`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Inline Feedback Comment input */}
                {feedbackPromptId === msg.id && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 max-w-[80%]">
                    <span className="font-semibold text-rose-800 text-[11px] block">
                      What was inaccurate or unhelpful?
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Price was wrong, didn't answer question..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1 text-xs outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setFeedbackPromptId(null)}
                        className="px-2 py-0.5 text-slate-500 hover:text-slate-700 text-[10px]"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => submitNegativeComment(msg.id)}
                        className="px-2.5 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Reasoning Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start space-y-1">
                <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 border border-slate-200 shadow-xs flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Checking live catalog & policies...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Suggestions */}
          {messages.length <= 2 && !isLoading && (
            <div className="p-3 bg-white border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Suggested Questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Find me a laptop under ₹60,000',
                  'Compare top headphones',
                  'Where is my order?',
                  'What is your return policy?',
                  'Do you have any coupon?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-xl text-[11px] text-slate-600 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={attachedImage.preview}
                  alt="Attached preview"
                  className="w-10 h-10 object-cover rounded-lg border border-indigo-200"
                />
                <div>
                  <span className="font-bold text-indigo-950 block text-[11px]">Image attached</span>
                  <span className="text-[10px] text-indigo-600">Will search visually similar products</span>
                </div>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Image Upload Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Upload image for visual search"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Speech Recognition Mic */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-200'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                }`}
                title={isListening ? 'Listening (click to stop)' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? 'Listening to voice...' : 'Ask about products, orders, returns...'}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && !attachedImage)}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Send message"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 pt-0.5">
              <span>Grounded in Commerce Engine catalog & policy</span>
              <span className="font-semibold text-slate-500">EN • हिन्दी • తెలుగు</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
