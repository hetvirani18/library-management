using System.ComponentModel.DataAnnotations;

namespace LibraryWebApi.DTOs;

public class BorrowBookRequest
{
    [Required]
    public int BookId { get; set; }

    [Required]
    public string MemberId { get; set; } = string.Empty;
}

public class ReturnBookRequest
{
    [Required]
    public int BookId { get; set; }

    [Required]
    public string MemberId { get; set; } = string.Empty;
}

public class BorrowRecordResponse
{
    public int RecordId { get; set; }
    public int BookId { get; set; }
    public string? BookTitle { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? UserFullName { get; set; }
    public DateTime BorrowedAt { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public bool IsOverdue { get; set; }
}
