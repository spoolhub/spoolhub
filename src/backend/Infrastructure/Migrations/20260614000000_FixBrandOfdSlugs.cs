using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixBrandOfdSlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Replace UUID-style slugs with the correct OFD snake_case slugs
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'bambu_lab'  WHERE OfdSlug = '1547b0a0_39fc_5114_bb7b_a6dfc2013bf7';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'esun_3d'    WHERE OfdSlug = 'ca87f4a3_d152_5e88_99c1_c355ab3016d3';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'elegoo'     WHERE OfdSlug = '65026f70_74db_5916_bc7a_63ffc8bff0b2';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'polymaker'  WHERE OfdSlug = '08110b99_03f7_5884_b7e7_07a3f659084d';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'sunlu'      WHERE OfdSlug = '1d35f140_7cba_5fa4_9bb6_9e3eb2fd95c6';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'overture'   WHERE OfdSlug = '66cc6a4e_bb46_5532_983c_0b3d76d753cd';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'prusament'  WHERE OfdSlug = '7d85fb9b_66ae_508e_94dd_79ede549d87e';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'creality'   WHERE OfdSlug = 'a3fa0112_9080_5c92_bf20_14acaca80178';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'hatchbox'   WHERE OfdSlug = 'ae5fbaa1_8427_5602_89d4_1c7dc82359f6';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'inland'     WHERE OfdSlug = 'bba7be5f_7cb3_55e9_9ae2_bfbc75b8ebbc';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '1547b0a0_39fc_5114_bb7b_a6dfc2013bf7' WHERE OfdSlug = 'bambu_lab';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'ca87f4a3_d152_5e88_99c1_c355ab3016d3' WHERE OfdSlug = 'esun_3d';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '65026f70_74db_5916_bc7a_63ffc8bff0b2' WHERE OfdSlug = 'elegoo';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '08110b99_03f7_5884_b7e7_07a3f659084d' WHERE OfdSlug = 'polymaker';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '1d35f140_7cba_5fa4_9bb6_9e3eb2fd95c6' WHERE OfdSlug = 'sunlu';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '66cc6a4e_bb46_5532_983c_0b3d76d753cd' WHERE OfdSlug = 'overture';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = '7d85fb9b_66ae_508e_94dd_79ede549d87e' WHERE OfdSlug = 'prusament';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'a3fa0112_9080_5c92_bf20_14acaca80178' WHERE OfdSlug = 'creality';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'ae5fbaa1_8427_5602_89d4_1c7dc82359f6' WHERE OfdSlug = 'hatchbox';");
            migrationBuilder.Sql("UPDATE Brands SET OfdSlug = 'bba7be5f_7cb3_55e9_9ae2_bfbc75b8ebbc' WHERE OfdSlug = 'inland';");
        }
    }
}
