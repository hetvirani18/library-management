namespace LibraryWebApi.DTOs;

public class DashboardStatsResponse
{
    public int TotalBooks { get; set; }
    public int TotalMembers { get; set; }
    public int CurrentlyBorrowed { get; set; }
    public int OverdueCount { get; set; }
}
