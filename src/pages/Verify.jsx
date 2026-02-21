// Verify.jsx
import { Box, Button, Stack, TextInput, Title, Notification } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

export function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const email = location.state?.email || "";

  const form = useForm({
    initialValues: {
      code: "",
    },
    validate: {
      code: (value) => (value ? null : "Verification code is required"),
    },
  });

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('http://localhost:5000/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: values.code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid verification code');
      }

      localStorage.setItem('userId', result.userId);
      setSuccess('Email verified successfully!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box py="xl" px="md">
      <Stack gap="lg">
        <Title order={2} ta="center" c="#e8e6e3" mb="0.8rem">
          Verify Your Email
        </Title>
        <Text ta="center" c="dimmed">
          A verification code has been sent to {email}.
        </Text>
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {error && (
              <Notification
                icon={<IconAlertCircle size={18} />}
                color="red"
                title="Error"
                onClose={() => setError(null)}
                mb="md"
              >
                {error}
              </Notification>
            )}
            {success && (
              <Notification
                icon={<IconCheck size={18} />}
                color="teal"
                title="Success"
                onClose={() => setSuccess(null)}
                mb="md"
              >
                {success}
              </Notification>
            )}
            <TextInput
              c="#e8e6e3"
              label="Verification Code"
              placeholder="Enter code"
              radius="md"
              required
              {...form.getInputProps("code")}
              styles={{ input: { fontSize: "1.125rem" }, label: { fontSize: "1.2rem", marginBottom: "0.6rem" } }}
            />
            <Button
              type="submit"
              radius="md"
              variant="default"
              loading={isSubmitting}
              disabled={isSubmitting}
              styles={{ root: { fontSize: "1.2rem" } }}
              mt="lg"
            >
              Verify
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}