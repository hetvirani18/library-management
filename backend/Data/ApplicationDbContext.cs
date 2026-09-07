using LibraryWebApi.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LibraryWebApi.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public DbSet<Book> Books { get; set; } = null!;
    public DbSet<BorrowRecord> BorrowRecords { get; set; } = null!;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<BorrowRecord>()
            .HasKey(record => record.RecordId);

        modelBuilder.Entity<BorrowRecord>()
            .HasOne(record => record.Book)
            .WithMany(book => book.BorrowRecords)
            .HasForeignKey(record => record.BookId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BorrowRecord>()
            .HasOne(record => record.User)
            .WithMany(user => user.BorrowRecords)
            .HasForeignKey(record => record.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
