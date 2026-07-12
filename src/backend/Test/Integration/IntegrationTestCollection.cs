namespace Test.Integration;

[CollectionDefinition(nameof(IntegrationTestCollection))]
public class IntegrationTestCollection : ICollectionFixture<ApiWebApplicationFactory>
{
}
