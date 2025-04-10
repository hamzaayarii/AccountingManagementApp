import { Link, useNavigate } from "react-router-dom";
// reactstrap components
import {
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Container,
  Media,
  Button,
  Badge,
  Nav,
  Navbar
} from "reactstrap";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';
import { io } from "socket.io-client";

const AdminNavbar = (props) => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationSound = useRef(new Audio("/notification-sound.mp3")); // Add sound file to your public folder
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const decoded = jwtDecode(token);
        const userId = decoded._id;

        const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data && response.data.user) {
          setUser(response.data.user);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, []);

   // Fetch notifications on initial render
   useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await axios.get("http://localhost:5000/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setNotifications(response.data);
        setUnreadCount(response.data.length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const socket = io("http://localhost:5000", { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    // Listen for new notifications
    socket.on("receive_notification", (notification) => {
      console.log("Received notification:", notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prevCount => prevCount + 1);

      // Play sound when new notification arrives
      try {
        notificationSound.current.play().catch(error => {
          console.log("Audio playback failed:", error);
        });
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  useEffect(() => {
    // Example: If your user data already contains business info
    if (props.userData && props.userData.business) {
      setBusiness(props.userData.business);
    } else {
      // Or fetch it separately if needed
      fetchUserBusiness();
    }
  }, [props.userData]);

  // Function to fetch user's business data
  const fetchUserBusiness = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await axios.get("http://localhost:5000/api/business/user-businesses", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.businesses && response.data.businesses.length > 0) {
        setBusiness(response.data.businesses[0]);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    // Clear user session or authentication token here
    localStorage.removeItem("authToken");
    
    // Disconnect socket before logout
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Redirect to login page and replace the current history entry
    navigate("/auth/login", { replace: true });
  };

  const toggleBusinessDropdown = () => {
    setShowBusinessDropdown(!showBusinessDropdown);
  };

  const navigateToBusiness = (businessId) => {
    navigate(`/admin/business-management/${businessId}`);
    setShowBusinessDropdown(false);
  };

  const redirectToBusinessRegistration = () => {
    navigate("/standalone/business-registration");
    setShowBusinessDropdown(false);
  };

  const handleNotificationClick = async (notification) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/auth/login", { replace: true });
        return;
      }

      // Mark notification as read
      await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Inform server that the notification was read (Socket)
      if (socketRef.current) {
        socketRef.current.emit('mark_notification_read', notification._id);
      }

      // Remove the read notification from the list
      setNotifications(prev => prev.filter(n => n._id !== notification._id));
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));

      // Navigate to the conversation if available
      if (notification.conversationId) {
        navigate(`/admin/messages/${notification.conversationId}`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.put("http://localhost:5000/api/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Emit event to inform server all notifications are read
      if (socketRef.current) {
        socketRef.current.emit('mark_all_notifications_read');
      }

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Format the timestamp for notifications
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <>
      <Navbar className="navbar-top navbar-dark" expand="md" id="navbar-main">
        <Container fluid>
          <Link
            className="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block"
            to="/"
          >
            {props.brandText}
          </Link>
          <Nav className="align-items-center d-none d-md-flex" navbar>
            {/* Business Selector */}
            <div className="business-selector mr-4 position-relative">
              <Button
                color="primary"
                className="d-flex align-items-center"
                onClick={toggleBusinessDropdown}
              >
                <i className="ni ni-building mr-2"></i>
                <span className="mr-2">
                  {business ? business.name : "Select Business"}
                </span>
                <i className={`ni ni-bold-${showBusinessDropdown ? 'up' : 'down'}`}></i>
              </Button>

              {/* Business Dropdown */}
              {showBusinessDropdown && (
                <div className="position-absolute bg-white rounded shadow-lg py-2"
                  style={{ top: "100%", right: 0, zIndex: 1000, minWidth: "200px" }}>
                  {/* If user has multiple businesses, map through them here */}
                  {business && (
                    <div
                      className="px-3 py-2 cursor-pointer hover-bg-light"
                      onClick={() => navigateToBusiness(business._id)}
                    >
                      <div className="font-weight-bold">{business.name}</div>
                      <div className="text-muted small">{business.type}</div>
                    </div>
                  )}
                  <div className="border-top mt-2 pt-2 px-3">
                    <Link to="/standalone/business-registration" className="text-primary d-block py-1">
                      <i className="ni ni-fat-add mr-2"></i> Add New Business
                    </Link>
                    <Link to="/admin/business-management" className="text-primary d-block py-1">
                      <i className="ni ni-settings mr-2"></i> Manage Businesses
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <UncontrolledDropdown nav className="mr-3">
              <DropdownToggle nav className="position-relative">
                <i className="ni ni-bell-55 text-white" style={{ fontSize: '18px' }}></i>
                {unreadCount > 0 && (
                  <Badge
                    color="danger"
                    pill
                    className="position-absolute"
                    style={{
                      top: '-5px',
                      right: '-5px',
                      fontSize: '10px',
                      padding: '2px 5px'
                    }}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </DropdownToggle>
              <DropdownMenu right className="notification-dropdown" style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  width: '320px',
                  padding: 0
              }}>
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                  <h6 className="m-0">Notifications</h6>
                  {unreadCount > 0 && (
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 text-muted"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <div className="text-center p-4 text-muted">
                    <i className="ni ni-bell-55 d-block mb-2" style={{ fontSize: '24px' }}></i>
                    <p className="m-0">No new notifications</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification, index) => (
                      <div 
                        key={notification._id || index}
                        className="notification-item p-3 border-bottom cursor-pointer hover-bg-light"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="d-flex align-items-start">
                          <div className="notification-avatar mr-3">
                            <div className="avatar rounded-circle bg-info text-white d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '40px' }}>
                              <i className="ni ni-chat-round"></i>
                            </div>
                          </div>
                          <div className="notification-content flex-grow-1">
                            <div className="d-flex justify-content-between">
                              <p className="font-weight-bold mb-0">{notification.senderName}</p>
                              <small className="text-muted">
                                {formatTimeAgo(notification.createdAt)}
                              </small>
                            </div>
                            <p className="text-sm mb-0 text-truncate">{notification.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-center p-2 border-top">
                  <Link to="/admin/messages" className="text-primary">
                    View all messages
                  </Link>
                </div>
              </DropdownMenu>
            </UncontrolledDropdown>

            {/* User Profile Dropdown */}
            <UncontrolledDropdown nav>
              <DropdownToggle className="pr-0" nav>
                <Media className="align-items-center">
                  <span className="avatar avatar-sm rounded-circle">
                    <img
                      alt="Profile"
                      src={user?.avatar || require("../../assets/img/theme/team-1-800x800.jpg")}
                    />
                  </span>
                  <Media className="ml-2 d-none d-lg-block">
                    <span className="mb-0 text-sm font-weight-bold">
                      {user?.name || "User"}
                    </span>
                  </Media>
                </Media>
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-arrow" right>
                <DropdownItem className="noti-title" header tag="div">
                  <h6 className="text-overflow m-0">Welcome!</h6>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-single-02" />
                  <span>My profile</span>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-settings-gear-65" />
                  <span>Settings</span>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-calendar-grid-58" />
                  <span>Activity</span>
                </DropdownItem>
                <DropdownItem to="/admin/user-profile" tag={Link}>
                  <i className="ni ni-support-16" />
                  <span>Support</span>
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem href="#pablo" onClick={handleLogout}>
                  <i className="ni ni-user-run" />
                  <span>Logout</span>
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
};

export default AdminNavbar;