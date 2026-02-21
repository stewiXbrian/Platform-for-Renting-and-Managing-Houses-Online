import { Box, Button, Group, PasswordInput, Stack, Text, TextInput, Title, Notification } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconLock, IconMail, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login({ setIsRegistered }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length < 6 ? "Password must be at least 6 characters" : null),
    },
  });

  const handleSubmit = async (values) => {
    setIsSubmitting(true);


    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'User not found' || result.error === 'Invalid password') {
          form.setErrors({ [result.error.includes('User') ? 'email' : 'password']: result.error });
        } else {
          form.setErrors({ general: result.error || 'Login failed' });
        }
        return;
      }

      if (result.success) {
        localStorage.setItem('userId', result.userId);
        navigate('/profile'); // Navigate only on successful login
      }
    } catch (err) {
      form.setErrors({ general: err.message || 'Network error. Check if server is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box py="xl" px="md">
      <Stack gap="lg">
        <Title order={2} ta="center" c="#e8e6e3" mb="0.8rem">
          Login to your account
        </Title>
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {form.errors.general && (
              <Notification
                icon={<IconAlertCircle size={18} />}
                color="red"
                title="Error"
                onClose={() => form.clearErrors()}
                mb="md"
              >
                {form.errors.general}
              </Notification>
            )}
            <TextInput
              c="#e8e6e3"
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size="1rem" />}
              radius="md"
              required
              error={form.errors.email}
              styles={{ input: { fontSize: "1.125rem" }, label: { fontSize: "1.2rem", marginBottom: "0.6rem" } }}
              {...form.getInputProps("email")}
            />
            <PasswordInput
              c="#e8e6e3"
              label="Password"
              placeholder="••••••••"
              leftSection={<IconLock size="1rem" />}
              radius="md"
              required
              error={form.errors.password}
              styles={{ input: { fontSize: "1.125rem" }, label: { fontSize: "1.2rem", marginBottom: "0.6rem" } }}
              {...form.getInputProps("password")}
            />
            <Group justify="flex-end" mt="xs">
              <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
                Forgot password?
              </Text>
            </Group>
            <Button
              type="submit"
              radius="md"
              variant="default"
              loading={isSubmitting}
              disabled={isSubmitting}
              styles={{ root: { fontSize: "1.2rem" } }}
            >
              Log in
            </Button>
          </Stack>
        </Box>
        <Group justify="center">
          <Text size="md" c="dimmed">Don't have an account? </Text>
          <Button
            size="md"
            variant="transparent"
            ml="-1.8rem"
            onClick={() => setIsRegistered((prev) => !prev)}
          >
            Sign up
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}