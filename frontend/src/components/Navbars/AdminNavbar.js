import { Link, useNavigate } from "react-router-dom";
// reactstrap components
import {
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Navbar,
  Nav,
  Container,
  Media,
  Button,
} from "reactstrap";
import { useState, useEffect } from "react";
import axios from "axios";
import {jwtDecode} from 'jwt-decode';

const AdminNavbar = (props) => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [user, setUser] = useState(null);

  // Fetch user data from the backend
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

  // Fetch business data - update this according to your API structure
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
    // For example, if you are using localStorage:
    localStorage.removeItem("authToken");

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
