using Microsoft.AspNetCore.Identity;

namespace LibraryWebApi.Models;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public DateTime MembershipDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string Role { get; set; } = "Member";

    public List<BorrowRecord> BorrowRecords { get; set; } = new();
}
