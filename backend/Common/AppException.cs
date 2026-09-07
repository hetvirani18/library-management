namespace LibraryWebApi.Common;

public class AppException : Exception
{
    public int Code { get; }
    public int StatusCode { get; }

    public AppException(string message, int code, int statusCode) : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}

public static class Errors
{
    public static readonly AppException ValidationFailed = new("Validation failed", 10002, 422);
    public static readonly AppException ResourceNotFound = new("Resource not found", 10003, 404);
    public static readonly AppException RouteNotFound = new("Route not found", 10004, 404);

    public static readonly AppException NoTokenProvided = new("No authentication token provided", 20001, 401);
    public static readonly AppException InvalidAuthToken = new("Invalid authentication token", 20002, 401);
    public static readonly AppException EmailAlreadyExists = new("Email already registered", 20003, 409);
    public static readonly AppException InvalidCredentials = new("Invalid email or password", 20004, 401);
    public static readonly AppException AccountDeactivated = new("This account has been deactivated", 20005, 401);
    public static readonly AppException AdminOnlyRoute = new("Librarian access required", 20006, 403);

    public static readonly AppException BookNotFound = new("Book not found", 30001, 404);
    public static readonly AppException MemberNotFound = new("Member not found", 30002, 404);
    public static readonly AppException NoAvailableCopies = new("No available copies of this book", 30003, 409);
    public static readonly AppException BookNotBorrowed = new("No active borrow record found for this book and member", 30004, 409);
    public static readonly AppException BookHasActiveBorrows = new("Cannot delete a book that has borrow history", 30005, 409);
}
