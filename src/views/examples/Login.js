import React, { useState } from 'react';
import axios from 'axios';
import { Form, FormGroup, Input, Button, FormFeedback, InputGroup, InputGroupAddon, InputGroupText, Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'L\'email est requis.';
    if (!emailRegex.test(value)) return 'Format d\'email invalide.';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters long.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/users/login', { email, password });
      console.log('Réponse du serveur:', response.data);

      if (response.data.success) {
        alert('Connexion Successful!');  // Alert success
        window.location.href = '/dashboard';  // Redirect to dashboard
      } else {
        alert('Erreur de connexion : ' + response.data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      if (error.response) {
        alert('Erreur : ' + error.response.data.message);
      } else {
        alert('Une erreur s\'est produite. Veuillez réessayer.');
      }
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col lg="5">
          <Card>
            <CardBody>
              <div className="text-center mb-4">
                <h2>Login</h2>
                <p>Please enter your email and password to login.</p>
              </div>
              <Form role="form" onSubmit={handleSubmit}>
                <FormGroup className="mb-3">
                  <InputGroup className="input-group-alternative">
                    <InputGroupAddon addonType="prepend">
                      <InputGroupText>
                        <i className="ni ni-email-83" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors({ ...errors, email: validateEmail(e.target.value) });
                      }}
                      invalid={!!errors.email}
                    />
                    <FormFeedback>{errors.email}</FormFeedback>
                  </InputGroup>
                </FormGroup>

                <FormGroup>
                  <InputGroup className="input-group-alternative">
                    <InputGroupAddon addonType="prepend">
                      <InputGroupText>
                        <i className="ni ni-lock-circle-open" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({ ...errors, password: validatePassword(e.target.value) });
                      }}
                      invalid={!!errors.password}
                    />
                    <FormFeedback>{errors.password}</FormFeedback>
                  </InputGroup>
                </FormGroup>

                <div className="text-center">
                  <Button
                    className="my-4"
                    color="primary"
                    type="submit"
                    disabled={!!errors.email || !!errors.password || !email || !password}
                  >
                    Login
                  </Button>
                </div>
                <div className="text-center">
                  <Link to="/auth/register">Don't have an account? Register</Link>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
