import React, { useState } from 'react';
import axios from 'axios';
import { Form, FormGroup, Input, Button, FormFeedback, InputGroup, InputGroupAddon, InputGroupText } from 'reactstrap';

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
    if (!value) return 'Le mot de passe est requis.';
    if (value.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
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
        alert('Connexion réussie !');
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
                placeholder="Mot de passe"
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
            Se connecter
          </Button>
        </div>
      </Form>
  );
};

export default Login;
