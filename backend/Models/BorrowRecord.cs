namespace LibraryWebApi.Models;

public class BorrowRecord
{
    public int RecordId { get; set; }

    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public DateTime BorrowedAt { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? ReturnedAt { get; set; }

    public bool IsReturned => ReturnedAt.HasValue;
    public bool IsOverdue => !IsReturned && DateTime.UtcNow > DueDate;
}
