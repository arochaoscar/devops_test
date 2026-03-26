import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import GreetingForm from "../greeting-form";

// --- Mocks ---

const mockGetGreetings = jest.fn();
const mockCreateGreeting = jest.fn();

jest.mock("@/app/actions", () => ({
  getGreetings: (...args: unknown[]) => mockGetGreetings(...args),
  createGreeting: (...args: unknown[]) => mockCreateGreeting(...args),
}));

jest.mock("react-google-recaptcha", () => {
  return {
    __esModule: true,
    default: jest.fn(() => null),
  };
});

// Helper: render and wait for initial fetch to settle
async function renderAndSettle(props: { recaptchaSiteKey: string }) {
  render(<GreetingForm {...props} />);
  await waitFor(() => {
    expect(mockGetGreetings).toHaveBeenCalled();
  });
}

// --- Tests ---

describe("GreetingForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetGreetings.mockResolvedValue([]);
    mockCreateGreeting.mockResolvedValue({ greetings: [] });
  });

  it("should render the form with input and submit button", async () => {
    await renderAndSettle({ recaptchaSiteKey: "" });

    expect(screen.getByLabelText(/leave your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("$ enter your name...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /say hello/i })).toBeInTheDocument();
  });

  it("should fetch and display greetings on mount", async () => {
    mockGetGreetings.mockResolvedValue([
      { name: "Alice", createdAt: new Date("2026-01-15T10:30:00Z"), ipAddress: "1.2.3.4", location: "NYC" },
    ]);

    await renderAndSettle({ recaptchaSiteKey: "" });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("NYC")).toBeInTheDocument();
    expect(screen.getByText("1 entry")).toBeInTheDocument();
  });

  it("should show error when submitting empty name", async () => {
    await renderAndSettle({ recaptchaSiteKey: "" });

    await user.click(screen.getByRole("button", { name: /say hello/i }));

    expect(screen.getByText("Please enter your name")).toBeInTheDocument();
    expect(mockCreateGreeting).not.toHaveBeenCalled();
  });

  it("should submit the form with a valid name", async () => {
    mockCreateGreeting.mockResolvedValue({
      greetings: [{ name: "Bob", createdAt: new Date(), ipAddress: "0.0.0.0", location: "Local Network" }],
    });

    await renderAndSettle({ recaptchaSiteKey: "" });

    await user.type(screen.getByPlaceholderText("$ enter your name..."), "Bob");
    await user.click(screen.getByRole("button", { name: /say hello/i }));

    await waitFor(() => {
      expect(mockCreateGreeting).toHaveBeenCalledWith("Bob", null);
    });
    expect(screen.getByText("Hello sent successfully!")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("should display server error from createGreeting", async () => {
    mockCreateGreeting.mockResolvedValue({ error: "Name is too long", greetings: [] });

    await renderAndSettle({ recaptchaSiteKey: "" });

    await user.type(screen.getByPlaceholderText("$ enter your name..."), "Test");
    await user.click(screen.getByRole("button", { name: /say hello/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is too long")).toBeInTheDocument();
    });
  });

  it("should show generic error when createGreeting throws", async () => {
    mockCreateGreeting.mockRejectedValue(new Error("Network error"));

    await renderAndSettle({ recaptchaSiteKey: "" });

    await user.type(screen.getByPlaceholderText("$ enter your name..."), "Test");
    await user.click(screen.getByRole("button", { name: /say hello/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to submit. Please try again.")).toBeInTheDocument();
    });
  });

  it("should clear input after successful submission", async () => {
    mockCreateGreeting.mockResolvedValue({ greetings: [] });

    await renderAndSettle({ recaptchaSiteKey: "" });

    const input = screen.getByPlaceholderText("$ enter your name...");
    await user.type(input, "Alice");
    await user.click(screen.getByRole("button", { name: /say hello/i }));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("should clear error when typing", async () => {
    await renderAndSettle({ recaptchaSiteKey: "" });

    await user.click(screen.getByRole("button", { name: /say hello/i }));
    expect(screen.getByText("Please enter your name")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("$ enter your name..."), "A");
    expect(screen.queryByText("Please enter your name")).not.toBeInTheDocument();
  });

  it("should show entries count label", async () => {
    mockGetGreetings.mockResolvedValue([
      { name: "A", createdAt: new Date(), ipAddress: "1.1.1.1", location: null },
      { name: "B", createdAt: new Date(), ipAddress: "2.2.2.2", location: null },
    ]);

    await renderAndSettle({ recaptchaSiteKey: "" });

    await waitFor(() => {
      expect(screen.getByText("2 entries")).toBeInTheDocument();
    });
  });

  it("should show dash for null location", async () => {
    mockGetGreetings.mockResolvedValue([
      { name: "Test", createdAt: new Date(), ipAddress: "1.1.1.1", location: null },
    ]);

    await renderAndSettle({ recaptchaSiteKey: "" });

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("should display avatar with first letter of name", async () => {
    mockGetGreetings.mockResolvedValue([
      { name: "Zara", createdAt: new Date(), ipAddress: "1.1.1.1", location: null },
    ]);

    await renderAndSettle({ recaptchaSiteKey: "" });

    await waitFor(() => {
      expect(screen.getByText("Z")).toBeInTheDocument();
    });
  });

  it("should disable submit button when captcha is required but not completed", async () => {
    await renderAndSettle({ recaptchaSiteKey: "test-site-key" });

    await user.type(screen.getByPlaceholderText("$ enter your name..."), "Test");

    const button = screen.getByRole("button", { name: /say hello/i });
    expect(button).toBeDisabled();
    expect(mockCreateGreeting).not.toHaveBeenCalled();
  });
});
